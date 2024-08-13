// src/messaging/messageSender.js

const { getClient } = require('../../services/auth/authService');
const logger = require('../utils/logger');
const { getPhoneNumberInfo, updatePhoneNumberStats, getUserPhoneNumbers } = require('../../services/phone/phoneNumberService');
const telegramSessionService = require('../../services/telegram');

async function simulateTyping(userId, duration) {
  const client = getClient();
  if (!client) {
    logger.warn('Telegram client is not initialized. Cannot simulate typing.');
    return;
  }

  try {
    await client.sendAction(userId, { action: "typing" });
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

    if (phoneInfo.is_banned) {
      throw new Error(`Phone number ${phoneNumber} is banned`);
    }

    if (phoneInfo.messages_sent_today >= phoneInfo.daily_limit) {
      throw new Error(`Daily limit reached for phone number ${phoneNumber}`);
    }

    if (phoneInfo.total_limit && phoneInfo.messages_sent_total >= phoneInfo.total_limit) {
      throw new Error(`Total limit reached for phone number ${phoneNumber}`);
    }

    const session = await telegramSessionService.getSession(phoneNumber);
    if (!session) {
      throw new Error(`No active session for phone number ${phoneNumber}`);
    }

    const result = await session.sendMessage(userId, { message: message });

    await updatePhoneNumberStats(phoneNumber, 1, 1);

    logger.info(`Message sent successfully from ${phoneNumber} to ${userId}`);
    return result;
  } catch (error) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

async function getUpdates() {
  const client = getClient();
  if (!client) {
    logger.warn('Telegram client is not initialized. Cannot get updates.');
    return [];
  }

  try {
    // Метод getUpdates может отсутствовать в GramJS. 
    // Вместо этого можно использовать обработчик событий, установленный в setupMessageHandler
    logger.info('Updates are handled by event handler. This method is deprecated.');
    return [];
  } catch (error) {
    logger.error('Error getting updates:', error);
    return [];
  }
}

async function checkNewMessages(userId) {
  const client = getClient();
  if (!client) {
    logger.warn('Telegram client is not initialized. Cannot check new messages.');
    return false;
  }

  try {
    const messages = await client.getMessages(userId, { limit: 1 });
    return messages.length > 0;
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