// src/services/auth/authService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const config = require('../../config');
const logger = require('../../utils/logger');
const { getPhoneNumber } = require('../../db');

let client;

async function authenticate() {
  try {
    const phoneNumber = await getPhoneNumber();
    if (!phoneNumber) {
      throw new Error('Номер телефона не установлен. Используйте команду /setnumber в админ-боте.');
    }

    logger.info('Starting authentication process...');
    const stringSession = new StringSession(""); // Используйте сохраненную сессию, если она есть
    client = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => {
        logger.info('Требуется двухфакторная аутентификация.');
        return await input.text("Введите ваш пароль 2FA: ");
      },
      phoneCode: async () => await input.text("Введите код подтверждения, полученный в Telegram: "),
      onError: (err) => logger.error(err),
    });

    logger.info('Аутентификация успешна!');
    logger.info('Session string:', client.session.save()); // Сохраните эту строку для будущего использования
    return client;
  } catch (error) {
    logger.error('Ошибка аутентификации:', error);
    throw error;
  }
}

function getClient() {
  if (!client) {
    throw new Error('Client is not authenticated. Call authenticate() first.');
  }
  return client;
}

module.exports = { authenticate, getClient };