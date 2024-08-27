// src/services/auth/authService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const config = require('../../config');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

let mainClient = null;
const SESSION_FILE_PATH = path.join(__dirname, '../../../temp/telegram_session.json');

async function loadSession() {
  try {
    const data = await fs.readFile(SESSION_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.warn('No saved session found or error reading session file:', error);
    return null;
  }
}

async function saveSession(session) {
  try {
    await fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session));
    logger.info('Session saved successfully');
  } catch (error) {
    logger.error('Error saving session:', error);
  }
}

async function checkAndInitializeSession() {
  const savedSession = await loadSession();
  if (savedSession) {
    try {
      const client = new TelegramClient(
        new StringSession(savedSession.session),
        config.API_ID,
        config.API_HASH,
        { connectionRetries: 5 }
      );
      await client.connect();
      const isAuthorized = await client.checkAuthorization();
      if (isAuthorized) {
        logger.info('Successfully restored previous session');
        mainClient = client;
        return true;
      }
    } catch (error) {
      logger.error('Error restoring session:', error);
    }
  }
  return false;
}

async function authenticate(phoneNumber) {
  if (await checkAndInitializeSession()) {
    return mainClient;
  }

  logger.info(`Authenticating phone number: ${phoneNumber}`);
  const stringSession = new StringSession("");
  const client = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
    connectionRetries: 5,
  });

  try {
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
    const session = client.session.save();
    await saveSession({ session, phoneNumber });
    mainClient = client;
    return client;
  } catch (error) {
    logger.error('Error authenticating Telegram client:', error);
    throw error;
  }
}

function getClient() {
  if (!mainClient) {
    throw new Error('Telegram client is not initialized. Call checkAndInitializeSession() or authenticate() first.');
  }
  return mainClient;
}

module.exports = { authenticate, getClient, checkAndInitializeSession };