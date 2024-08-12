// src/services/auth/authService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const config = require('../../config');
const logger = require('../../utils/logger');
const { getPhoneNumber } = require('../../db');

let mainClient;

async function authenticate() {
  try {
    const phoneNumber = await getPhoneNumber();
    if (!phoneNumber) {
      throw new Error('Номер телефона не установлен. Используйте команду /setnumber в админ-боте.');
    }

    logger.info('Starting authentication process for main client...');
    const stringSession = new StringSession(""); // Используйте сохраненную сессию, если она есть
    mainClient = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 5,
    });

    await mainClient.start({
      phoneNumber: async () => phoneNumber,
      password: async () => await input.text("Введите ваш пароль 2FA: "),
      phoneCode: async () => await input.text("Введите код подтверждения, полученный в Telegram: "),
      onError: (err) => logger.error(err),
    });

    logger.info('Main client authenticated successfully!');
    logger.info('Session string:', mainClient.session.save()); // Сохраните эту строку для будущего использования
    return mainClient;
  } catch (error) {
    logger.error('Error authenticating main client:', error);
    throw error;
  }
}

function getClient() {
  if (!mainClient) {
    throw new Error('Main client is not authenticated. Call authenticateMainClient() first.');
  }
  return mainClient;
}

module.exports = { authenticate, getClient };