// src/services/telegram/managers/sessionManager.js

const logger = require('../../../utils/logger');

let TelegramSessionService;

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

async function reauthorizeSession(phoneNumber) {
  if (!TelegramSessionService) {
    throw new Error('TelegramSessionService not initialized');
  }

  try {
    logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
    return await TelegramSessionService.reauthorizeSession(phoneNumber);
  } catch (error) {
    logger.error(`Error reauthorizing session for ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  setTelegramSessionService,
  getOrCreateSession,
  reauthorizeSession
};