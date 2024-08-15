// src/messaging/src/messageSender.js

const logger = require('../../utils/logger');
const { getPhoneNumberInfo, updatePhoneNumberStats } = require('../../services/phone/phoneNumberService');
const TelegramSessionService = require('../../services/telegram/telegramSessionService');
const { Api } = require('telegram/tl');
const { safeStringify } = require('../../utils/helpers');
const OnlineStatusManager = require('../../services/telegram/onlineStatusManager');

async function getCorrectPeer(session, userId) {
  try {
    logger.info(`Getting correct peer for user ${userId}`);
    const user = await session.invoke(new Api.users.GetUsers({
      id: [new Api.InputUser({
        userId: BigInt(userId),
        accessHash: BigInt(0)
      })]
    }));
    
    if (user && user.length > 0) {
      logger.info(`User found: ${safeStringify(user[0])}`);
      return new Api.InputPeerUser({
        userId: BigInt(user[0].id),
        accessHash: BigInt(user[0].accessHash)
      });
    }
    
    logger.info(`User not found, searching in dialogs`);
    const dialogs = await session.getDialogs();
    const dialog = dialogs.find(d => d.entity && d.entity.id.toString() === userId.toString());
    if (dialog) {
      logger.info(`Dialog found: ${safeStringify(dialog.inputEntity)}`);
      return dialog.inputEntity;
    }
    
    throw new Error('User or dialog not found');
  } catch (error) {
    logger.error(`Error in getCorrectPeer: ${error.message}`);
    if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
      logger.info(`Attempting to reauthorize session for ${session.phoneNumber}`);
      await TelegramSessionService.reauthorizeSession(session.phoneNumber);
      return getCorrectPeer(await TelegramSessionService.getSession(session.phoneNumber), userId);
    }
    throw error;
  }
}


async function checkSession(phoneNumber) {
  const session = await TelegramSessionService.getSession(phoneNumber);
  if (!session || !session.connected) {
    logger.warn(`Session for ${phoneNumber} is not connected. Trying to reconnect...`);
    await session.connect();
  }
  return session;
}

async function simulateTyping(userId, duration, phoneNumber) {
  const session = await TelegramSessionService.getSession(phoneNumber);
  if (!session) {
    logger.warn(`No active session for phone number ${phoneNumber}. Cannot simulate typing.`);
    return;
  }

  try {
    const peer = await getCorrectPeer(session, userId);
    const totalDuration = duration;
    let elapsedTime = 0;

    while (elapsedTime < totalDuration) {
      const typingDuration = Math.min(Math.floor(Math.random() * (10 - 5 + 1) + 5) * 1000, totalDuration - elapsedTime);
      
      await session.invoke(new Api.messages.SetTyping({
        peer: peer,
        action: new Api.SendMessageTypingAction()
      }));

      await new Promise(resolve => setTimeout(resolve, typingDuration));
      elapsedTime += typingDuration;

      if (elapsedTime < totalDuration) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        elapsedTime += 1000;
      }
    }
  } catch (error) {
    logger.error('Error simulating typing:', error);
  }
}

async function checkNewMessages(userId, session) {
  try {
    const peer = await getCorrectPeer(session, userId);
    const messages = await session.invoke(new Api.messages.GetHistory({
      peer: peer,
      limit: 1,
      offsetId: 0,
      offsetDate: 0,
      addOffset: 0,
      maxId: 0,
      minId: 0,
      hash: BigInt(0)
    }));

    // logger.info(`Checked for new messages. Result: ${safeStringify(messages)}`);
    
    if (messages.messages.length > 0 && !messages.messages[0].out) {
      const lastMessageDate = new Date(messages.messages[0].date * 1000);
      const currentDate = new Date();
      const timeDifference = currentDate - lastMessageDate;
      
      // Если сообщение было отправлено менее 5 секунд назад, считаем его новым
      if (timeDifference < 5000) {
        logger.info(`New message detected. Time difference: ${timeDifference}ms`);
        return true;
      }
    }
    
    logger.info('No new messages detected');
    return false;
  } catch (error) {
    logger.error('Error checking new messages:', error);
    return false;
  }
}
async function sendMessage(userId, message, phoneNumber) {
  try {
    logger.info(`Starting sendMessage for user ${userId} from ${phoneNumber}`);
    const phoneInfo = await getPhoneNumberInfo(phoneNumber);
    logger.info(`Phone info for ${phoneNumber}: ${safeStringify(phoneInfo)}`);

    if (phoneInfo.is_banned) {
      throw new Error(`Phone number ${phoneNumber} is banned`);
    }

    if (phoneInfo.messages_sent_today >= phoneInfo.daily_limit) {
      throw new Error(`Daily limit reached for phone number ${phoneNumber}`);
    }

    const session = await checkSession(phoneNumber);
    logger.info(`Session checked for ${phoneNumber}`);
    
    const peer = await getCorrectPeer(session, userId);
    logger.info(`Peer obtained for user ${userId}: ${safeStringify(peer)}`);

    logger.info(`Attempting to send message: "${message}"`);
    const result = await session.invoke(new Api.messages.SendMessage({
      peer: peer,
      message: message,
      randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
    }));

    logger.info(`Message sent successfully from ${phoneNumber} to ${userId}: ${safeStringify(result)}`);

    await updatePhoneNumberStats(phoneNumber, 1, 1);

    return result;
  } catch (error) {
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
}
  
let isResponding = false;

async function simulateHumanBehavior(session, userId, response) {
  logger.info(`Starting simulateHumanBehavior for user ${userId}`);
  if (isResponding) {
    logger.info('Already responding, cancelling previous response');
    return;
  }
  
  isResponding = true;
  try {
    await OnlineStatusManager.setOnline(userId, session);
    logger.info(`Setting online status for ${session.phoneNumber}`);
    await session.invoke(new Api.account.UpdateStatus({
      offline: false
    }));

    const initialDelay = Math.random() * 15000 + 5000;
    logger.info(`Waiting for ${initialDelay}ms before starting response`);
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    const sentences = response.split(/(?<=[.!?])\s+/);
    logger.info(`Response split into ${sentences.length} sentences`);
    for (const sentence of sentences) {
      try {
        if (await checkNewMessages(userId, session)) {
          logger.info('New message received, stopping response');
          break;
        }

        const typingDuration = Math.random() * 5000 + 5000;
        logger.info(`Simulating typing for ${typingDuration}ms`);
        await simulateTyping(session, userId, typingDuration);

        logger.info(`Attempting to send sentence: "${sentence}"`);
        await sendMessage(userId, sentence, session.phoneNumber);
        logger.info(`Sentence sent successfully: "${sentence}"`);

        const messageDelay = Math.random() * 3000 + 1000;
        logger.info(`Waiting for ${messageDelay}ms before next sentence`);
        await new Promise(resolve => setTimeout(resolve, messageDelay));
      } catch (error) {
        logger.error(`Error processing sentence for user ${userId}:`, error);
      }
    }
  } catch (error) {
    logger.error(`Error in simulateHumanBehavior: ${error.message}`);
  } finally {
    isResponding = false;
    logger.info(`Finished simulateHumanBehavior for user ${userId}`);
  }
}
  
  async function simulateTyping(session, userId, duration) {
    let elapsedTime = 0;
    while (elapsedTime < duration) {
      const currentTypingDuration = Math.min(Math.random() * 3000 + 2000, duration - elapsedTime);
      
      try {
        await session.invoke(new Api.messages.SetTyping({
          peer: await getCorrectPeer(session, userId),
          action: new Api.SendMessageTypingAction()
        }));
      } catch (error) {
        logger.error('Error setting typing status:', error);
      }
  
      await new Promise(resolve => setTimeout(resolve, currentTypingDuration));
      elapsedTime += currentTypingDuration;
  
      // Случайная пауза в печатании
      if (Math.random() < 0.3 && elapsedTime < duration) {  // 30% шанс на паузу
        const pauseDuration = Math.random() * 2000 + 1000;  // 1-3 секунды паузы
        await new Promise(resolve => setTimeout(resolve, pauseDuration));
        elapsedTime += pauseDuration;
      }
    }
  }

module.exports = {
  simulateHumanBehavior,
  getCorrectPeer,
  checkNewMessages
};