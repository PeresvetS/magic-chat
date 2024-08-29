// src/services/messaging/src/messageSender.js

const { Api } = require('telegram/tl');
const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');
const { TelegramSessionService } = require('../../telegram');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const { WhatsAppSessionService } = require('../../whatsapp');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const { getPhoneNumberInfo, updatePhoneNumberStats } = require('../../phone').phoneNumberService;

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000;

async function retryOperation(operation, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.message === 'TIMEOUT' && i < attempts - 1) {
        logger.warn(`Operation timed out. Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

async function sendMessage(userId, message, phoneNumber, platform = 'telegram') {
  try {
    logger.info(`Starting sendMessage for ${platform} user ${userId} from ${phoneNumber}`);
    await validatePhoneNumber(phoneNumber);

    let result;
    if (platform === 'whatsapp') {
      const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
      result = await retryOperation(() => client.sendMessage(userId, message));
    } else {
      const { peer, session } = await TelegramBotStateManager.getCorrectPeer(phoneNumber, userId);
      result = await retryOperation(() => session.invoke(new Api.messages.SendMessage({
        peer: peer,
        message: message,
        randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
      })));
    }

    logger.info(`${platform} message sent successfully from ${phoneNumber} to ${userId}: ${safeStringify(result)}`);
    await updatePhoneNumberStats(phoneNumber, platform);

    return result;
  } catch (error) {
    return handleSendMessageError(error, userId, message, phoneNumber, platform);
  }
}


async function sendResponse(userId, response, phoneNumber, platform = 'telegram') { 
  if (!response) {
    logger.warn(`Attempted to send empty ${platform} response to ${userId}`);
    return;
  }
  const sentences = response.split(/(?<=[.!?])\s+/);

  const BotStateManager = platform === 'whatsapp' ? WhatsAppBotStateManager : TelegramBotStateManager;

  const sendPromise = new Promise(async (resolve, reject) => {
    for (const sentence of sentences) {
      if (BotStateManager.isResponseInterrupted(userId)) {
        logger.info(`Response interrupted for user ${userId}`);
        BotStateManager.interruptedResponses.delete(userId);
        resolve();
        return;
      }

      await BotStateManager.setTyping(phoneNumber, userId);
      logger.info(`Sending message to ${userId}: ${sentence}`);
      const result = await sendMessage(userId, sentence, phoneNumber, platform);
      logger.info(`Message sent to ${userId}, result: ${JSON.stringify(result)}`);
      BotStateManager.resetOfflineTimer(phoneNumber, userId);  

      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    }

    if (!BotStateManager.isResponseInterrupted(userId)) {
      await BotStateManager.setOnline(phoneNumber, userId);
    }
    resolve();
  });

  sendPromise.cancel = () => {
    BotStateManager.interruptCurrentResponse(userId);
  };

  return sendPromise;
}

async function validatePhoneNumber(phoneNumber) {
  const phoneInfo = await getPhoneNumberInfo(phoneNumber);
  logger.info(`Phone info for ${phoneNumber}: ${safeStringify(phoneInfo)}`);

  if (phoneInfo.is_banned) {
    throw new Error(`Phone number ${phoneNumber} is banned`);
  }
}

async function handleSendMessageError(error, userId, message, phoneNumber, platform) {
  logger.error(`Error sending ${platform} message from ${phoneNumber} to ${userId}: ${error.message}`);
  
  if (platform === 'telegram') {
    if (error.message.includes('FLOOD_WAIT')) {
      const seconds = parseInt(error.message.split('_')[2]);
      logger.warn(`FloodWaitError: Waiting for ${seconds} seconds before retrying`);
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      return sendMessage(userId, message, phoneNumber, platform);
    }
    
    if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
      logger.info(`Attempting to reauthorize Telegram session for ${phoneNumber}`);
      await TelegramSessionService.reauthorizeSession(phoneNumber);
      logger.info(`Telegram session reauthorized for ${phoneNumber}, retrying message send`);
      return sendMessage(userId, message, phoneNumber, platform);
    }
  } else if (platform === 'whatsapp') {
    if (error.message.includes('unable to send message')) {
      logger.info(`Attempting to reauthorize WhatsApp session for ${phoneNumber}`);
      await WhatsAppSessionService.reauthorizeSession(phoneNumber);
      logger.info(`WhatsApp session reauthorized for ${phoneNumber}, retrying message send`);
      return sendMessage(userId, message, phoneNumber, platform);
    }
  }
  
  throw error;
}

module.exports = { sendMessage, sendResponse };