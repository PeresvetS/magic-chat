// src/main.js

const { authenticate } = require('./services/auth/authService');
const logger = require('./utils/logger');

async function initializeTelegramClient() {
  try {
    const client = await authenticate();
    if (!client) {
      logger.warn('Failed to initialize and authenticate Telegram client.');
      return false;
    }
    logger.info('Telegram client initialized and authenticated successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing Telegram client:', error);
    return false;
  }
}

module.exports = { initializeTelegramClient };