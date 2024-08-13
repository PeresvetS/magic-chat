// src/messaging/messageSender.js

const { getClient } = require('../../services/auth/authService');
const logger = require('../utils/logger');
const { getPhoneNumberInfo, updatePhoneNumberStats } = require('../../services/phone/phoneNumberService');
const telegramSessionService = require('../../services/telegram');

async function simulateTyping(userId, duration) {
  const client = getClient();
  if (!client) {
    logger.warn('Telegram client is not initialized. Cannot simulate typing.');
    return;
  }

  try {
    const totalDuration = duration;
    let elapsedTime = 0;
    while (elapsedTime < totalDuration) {
      const typingDuration = Math.min(Math.floor(Math.random() * (10 - 5 + 1) + 5) * 1000, totalDuration - elapsedTime);
      await client.sendAction(userId, { action: "typing" });
      await new Promise(resolve => setTimeout(resolve, typingDuration));
      elapsedTime += typingDuration;

      if (elapsedTime < totalDuration) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second pause
        elapsedTime += 1000;
      }
    }
  } catch (error) {
    logger.error('Error simulating typing:', error);
  }
}

async function sendMessage(userId, message, phoneNumber) {
  try {
    const phoneInfo = await getPhoneNumberInfo(phoneNumber);

    if (phoneInfo.is_banned) {
      throw new Error(`Phone number ${phoneNumber} is banned`);
    }

    if (phoneInfo.messages_sent_today >= phoneInfo.daily_limit) {
      throw new Error(`Daily limit reached for phone number ${phoneNumber}`);
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

async function checkNewMessages(userId) {
  const client = getClient();
  if (!client) {
    logger.warn('Telegram client is not initialized. Cannot check new messages.');
    return false;
  }

  try {
    const messages = await client.getMessages(userId, { limit: 1 });
    return messages.length > 0 && messages[0].out === false;
  } catch (error) {
    logger.error('Error checking new messages:', error);
    return false;
  }
}

module.exports = {
  simulateTyping,
  sendMessage,
  checkNewMessages
};