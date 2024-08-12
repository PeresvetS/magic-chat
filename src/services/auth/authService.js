// src/services/auth/authService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const config = require('../../config');
const logger = require('../../utils/logger');
const { getPhoneNumber, setPhoneNumber } = require('../../db/postgres/phoneNumbers');

let mainClient = null;

async function authenticate() {
  try {
    logger.info('Initializing and authenticating Telegram client...');
    logger.info(`Using API_ID: ${config.API_ID} (type: ${typeof config.API_ID})`);
    
    let phoneNumber = await getPhoneNumber();
    
    if (!phoneNumber) {
      logger.warn('Phone number is not set. Prompting for input...');
      phoneNumber = await input.text("Введите номер телефона для аутентификации: ");
      await setPhoneNumber(phoneNumber);
    }

    const stringSession = new StringSession(""); // Используйте сохраненную сессию, если она есть
    mainClient = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 5,
    });

    await mainClient.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await input.text("Введите ваш пароль 2FA: "),
      phoneCode: async () => await input.text("Введите код подтверждения, полученный в Telegram: "),
      onError: (err) => {
        logger.error('Error during Telegram client authentication:', err);
        throw err;
      },
    });

    logger.info('Telegram client authenticated successfully!');
    logger.info('Session string:', mainClient.session.save());
    return mainClient;
  } catch (error) {
    logger.error('Error initializing and authenticating Telegram client:', error);
    mainClient = null;
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