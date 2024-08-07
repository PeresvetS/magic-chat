// src/messaging/messageSender.js

const { client } = require('../services/authService');
const logger = require('../utils/logger');
const { getPhoneNumberInfo, updatePhoneNumberStats, getUserPhoneNumbers } = require('../services/phone/phoneNumberService');
const telegramSessionService = require('../services/phone/telegramSessionService');

async function simulateTyping(userId, duration) {
  try {
    await client('messages.setTyping', {
      peer: {
        _: 'inputPeerUser',
        user_id: userId,
        access_hash: userId.toString()
      },
      action: {
        _: 'sendMessageTypingAction'
      }
    });
    await new Promise(resolve => setTimeout(resolve, duration));
  } catch (error) {
    logger.error('Error simulating typing:', error);
  }
}

async function selectAvailablePhoneNumber(userId) {
  const phoneNumbers = await getUserPhoneNumbers(userId);
  for (const phoneNumber of phoneNumbers) {
    const phoneInfo = await getPhoneNumberInfo(phoneNumber);
    if (!phoneInfo.is_banned && phoneInfo.messages_sent_today < phoneInfo.daily_limit) {
      return phoneNumber;
    }
  }
  return null;
}

async function sendMessage(userId, message) {
  try {
    const phoneNumber = await selectAvailablePhoneNumber(userId);
    if (!phoneNumber) {
      throw new Error('No available phone numbers to send message');
    }

    const phoneInfo = await getPhoneNumberInfo(phoneNumber);

    // Проверка на бан
    if (phoneInfo.is_banned) {
      throw new Error(`Phone number ${phoneNumber} is banned`);
    }

    // Проверка дневного лимита
    if (phoneInfo.messages_sent_today >= phoneInfo.daily_limit) {
      throw new Error(`Daily limit reached for phone number ${phoneNumber}`);
    }

    // Проверка общего лимита
    if (phoneInfo.total_limit && phoneInfo.messages_sent_total >= phoneInfo.total_limit) {
      throw new Error(`Total limit reached for phone number ${phoneNumber}`);
    }

    const session = telegramSessionService.getSession(phoneNumber);
    if (!session) {
      throw new Error(`No active session for phone number ${phoneNumber}`);
    }

    const result = await session('messages.sendMessage', {
      peer: {
        _: 'inputPeerUser',
        user_id: userId,
        access_hash: userId.toString()
      },
      message: message,
      random_id: Math.ceil(Math.random() * 0xffffff) + Math.ceil(Math.random() * 0xffffff)
    });

    // Обновление статистики
    await updatePhoneNumberStats(phoneNumber, 1, 1);

    logger.info(`Message sent successfully from ${phoneNumber} to ${userId}`);
    return result;
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

async function getUpdates() {
  try {
    const updates = await client('updates.getState', {});
    logger.info('Received updates:', updates);
    return updates;
  } catch (error) {
    logger.error('Error getting updates:', error);
    throw error;
  }
}

async function checkNewMessages(userId) {
  try {
    const history = await client('messages.getHistory', {
      peer: {
        _: 'inputPeerUser',
        user_id: userId,
        access_hash: userId.toString()
      },
      limit: 1
    });
    return history.messages.length > 0;
  } catch (error) {
    logger.error('Error checking new messages:', error);
    return false;
  }
}

module.exports = {
  simulateTyping,
  sendMessage,
  getUpdates,
  checkNewMessages
};