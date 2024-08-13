// src/services/auth/authService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const config = require('../../config');
const logger = require('../../utils/logger');

let mainClient = null;

async function authenticate(phoneNumber) {
  try {
    logger.info(`Authenticating phone number: ${phoneNumber}`);
    logger.info(`Using API_ID: ${config.API_ID} (type: ${typeof config.API_ID})`);
    
    const stringSession = new StringSession(""); // Используйте сохраненную сессию, если она есть
    const client = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await input.text("Введите ваш пароль 2FA: "),
      phoneCode: async () => await input.text("Введите код подтверждения, полученный в Telegram: "),
      onError: (err) => {
        logger.error('Error during Telegram client authentication:', err);
        throw err;
      },
    });

    logger.info('Telegram client authenticated successfully!');
    logger.info('Session string:', client.session.save());
    mainClient = client;
    return client;
  } catch (error) {
    logger.error('Error authenticating Telegram client:', error);
    throw error;
  }
}

function getClient() {
  if (!mainClient) {
    throw new Error('Telegram client is not initialized. Call authenticate() first.');
  }
  return mainClient;
}

module.exports = { authenticate, getClient };