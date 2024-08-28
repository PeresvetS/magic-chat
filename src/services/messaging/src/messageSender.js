// src/services/messaging/src/messageSender.js

const logger = require('../../../utils/logger');
const { Api } = require('telegram/tl');
const { safeStringify } = require('../../../utils/helpers');
const BotStateManager = require('../../telegram/managers/botStateManager');
const { getPhoneNumberInfo, updatePhoneNumberStats } = require('../../phone').phoneNumberService;

async function sendMessage(userId, message, phoneNumber) {
  try {
    logger.info(`Starting sendMessage for user ${userId} from ${phoneNumber}`);
    await validatePhoneNumber(phoneNumber);
    
    const { peer, session } = await BotStateManager.getCorrectPeer(phoneNumber, userId);

    logger.info(`Attempting to send message: "${message}"`);
    const result = await session.invoke(new Api.messages.SendMessage({
      peer: peer,
      message: message,
      randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
    }));

    logger.info(`Message sent successfully from ${phoneNumber} to ${userId}: ${safeStringify(result)}`);
    await updatePhoneNumberStats(phoneNumber, 'telegram');

    return result;
  } catch (error) {
    return handleSendMessageError(error, userId, message, phoneNumber);
  }
}

async function sendResponse(userId, response, phoneNumber) {
  if (!response) {
    logger.warn(`Attempted to send empty response to ${userId}`);
    return;
  }
  const sentences = response.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (await BotStateManager.checkUserTyping(phoneNumber, userId)) {
      logger.info(`User ${userId} started typing, interrupting response`);
      break;
    }

    await BotStateManager.setTyping(phoneNumber, userId);
    await sendMessage(userId, sentence, phoneNumber);
    BotStateManager.resetOfflineTimer(phoneNumber, userId);  
    
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 0));
  }
  await BotStateManager.setOnline(phoneNumber, userId);
}

async function validatePhoneNumber(phoneNumber) {
  const phoneInfo = await getPhoneNumberInfo(phoneNumber);
  logger.info(`Phone info for ${phoneNumber}: ${safeStringify(phoneInfo)}`);

  if (phoneInfo.is_banned) {
    throw new Error(`Phone number ${phoneNumber} is banned`);
  }

  // Раскомментируйте, если нужно проверять дневной лимит
  // if (phoneInfo.messages_sent_today >= phoneInfo.daily_limit) {
  //   throw new Error(`Daily limit reached for phone number ${phoneNumber}`);
  // }
}

async function handleSendMessageError(error, userId, message, phoneNumber) {
  const { TelegramSessionService } = require('../../telegram/');
  logger.error(`Error sending message from ${phoneNumber} to ${userId}: ${error.message}`);
  
  if (error.message.includes('FLOOD_WAIT')) {
    const seconds = parseInt(error.message.split('_')[2]);
    logger.warn(`FloodWaitError: Waiting for ${seconds} seconds before retrying`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return sendMessage(userId, message, phoneNumber);
  }
  
  if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
    logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
    await TelegramSessionService.reauthorizeSession(phoneNumber);
    logger.info(`Session reauthorized for ${phoneNumber}, retrying message send`);
    return sendMessage(userId, message, phoneNumber);
  }
  
  throw error;
}

module.exports = { sendMessage, sendResponse };