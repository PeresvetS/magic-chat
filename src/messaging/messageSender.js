// src/messaging/messageSender.js

const { getClient } = require('../services/auth/authService');
const logger = require('../utils/logger');
const { getPhoneNumberInfo, updatePhoneNumberStats, getUserPhoneNumbers } = require('../services/phone/phoneNumberService');
const telegramSessionService = require('../services/phone/telegramSessionService');

async function simulateTyping(userId, duration) {
  try {
    const client = getClient();
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
  try {
    const client = getClient();
    const updates = await client.getUpdates();
    logger.info('Received updates:', updates);
    return updates;
  } catch (error) {
    logger.error('Error getting updates:', error);
    throw error;
  }
}

async function checkNewMessages(userId) {
  try {
    const client = getClient();
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
