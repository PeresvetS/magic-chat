// src/main.js

const { authenticate } = require('./services/auth/authService');
const logger = require('./utils/logger');

async function initializeTelegramClient() {
  try {
    await authenticate();
    logger.info('Telegram client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Telegram client:', error);
    throw error;
  }
}

module.exports = { initializeTelegramClient };