// src/services/telegram/managers/sessionManager.js

const logger = require('../../../utils/logger');
const { LRUCache } = require('lru-cache');


let TelegramSessionService;
const sessionCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 60 
});


function setTelegramSessionService(service) {
  TelegramSessionService = service;
}

async function getOrCreateSession(phoneNumber) {
  if (!TelegramSessionService) {
    throw new Error('TelegramSessionService not initialized');
  }

  try {
    let session = sessionCache.get(phoneNumber);
    if (session && session.connected) {
      logger.debug(`Using cached session for ${phoneNumber}`);
      return session;
    }

    session = await TelegramSessionService.createOrGetSession(phoneNumber);
    if (!session || !session.connected) {
      logger.warn(`Session for ${phoneNumber} is not connected. Trying to reconnect...`);
      session = await reconnectWithRetry(session);
      if (!session || !session.connected) {
        logger.warn(`Reconnection failed. Attempting to reauthorize...`);
        session = await reauthorizeSession(phoneNumber);
      }
    }

    sessionCache.set(phoneNumber, session);
    return session;
  } catch (error) {
    return handleSessionError(error, `Error getting or creating session for ${phoneNumber}`);
  }
}

async function reconnectWithRetry(session, maxAttempts = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await session.connect();
      if (session.connected) {
        logger.info(`Successfully reconnected session on attempt ${attempt}`);
        return session;
      } else {
        throw new Error('Session not connected after reconnect attempt');
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Reconnection attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to reconnect after max attempts');
} 

async function reauthorizeSession(phoneNumber) {
  if (!TelegramSessionService) {
    throw new Error('TelegramSessionService not initialized');
  }

  try {
    logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
    const session = await TelegramSessionService.reauthorizeSession(phoneNumber);
    sessionCache.set(phoneNumber, session);
    return session;
  } catch (error) {
    handleSessionError(error, `Error reauthorizing session for ${phoneNumber}`);
  }
}

function handleSessionError(error, message) {
  logger.error(`${message}:`, error);
  if (error.code === 406 && error.errorMessage === 'AUTH_KEY_DUPLICATED') {
    logger.warn('AUTH_KEY_DUPLICATED error detected. Attempting to reauthorize the session.');
    return reauthorizeSession(phoneNumber);
  }
  throw error;
}

module.exports = {
  setTelegramSessionService,
  getOrCreateSession,
  reauthorizeSession
};
