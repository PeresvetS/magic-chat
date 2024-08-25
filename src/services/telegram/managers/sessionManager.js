// src/services/telegram/managers/sessionManager.js

const logger = require('../../../utils/logger');

let TelegramSessionService;

// Функция для установки TelegramSessionService после его инициализации
function setTelegramSessionService(service) {
  TelegramSessionService = service;
}

async function getOrCreateSession(phoneNumber) {
  if (!TelegramSessionService) {
    throw new Error('TelegramSessionService not initialized');
  }

  try {
    const session = await TelegramSessionService.createOrGetSession(phoneNumber);
    if (!session || !session.connected) {
      logger.warn(`Session for ${phoneNumber} is not connected. Trying to reconnect...`);
      await session.connect();
    }
    return session;
  } catch (error) {
    logger.error(`Error getting or creating session for ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  setTelegramSessionService,
  getOrCreateSession
};