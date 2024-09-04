// src/services/telegram/onlineStatusManager.js

const { Api } = require('telegram/tl');
const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

class OnlineStatusManager {
    constructor() {
      this.onlineUsers = new Map();
      this.timeoutDuration = 20000; // 20 seconds
      logger.info('OnlineStatusManager initialized');
    }
  
    async setOnline(userId, session) {
      try {
        logger.info(`Setting online status for user ${userId}`);
        if (this.onlineUsers.has(userId)) {
          clearTimeout(this.onlineUsers.get(userId));
          logger.info(`Cleared existing timeout for user ${userId}`);
        }
        this.onlineUsers.set(userId, setTimeout(() => this.setOffline(userId, session), this.timeoutDuration));
        const result = await session.invoke(new Api.account.UpdateStatus({ offline: false }));
        logger.info(`Online status set for user ${userId}, result: ${safeStringify(result)}`);

        return result;
      } catch (error) {
        logger.error(`Error setting online status for user ${userId}:`, safeStringify(error));
        throw error;
      }
    }
  
    async setOffline(userId, session) {
      try {
        logger.info(`Setting offline status for user ${userId}`);
        this.onlineUsers.delete(userId);
        await session.invoke(new Api.account.UpdateStatus({ offline: true }));
        logger.info(`Offline status set for user ${userId}`);
      } catch (error) {
        logger.error(`Error setting offline status for user ${userId}:`, safeStringify(error));
      }
    }
  
    isOnline(userId) {
      const isOnline = this.onlineUsers.has(userId);
      logger.info(`Checking online status for user ${userId}: ${isOnline}`);
      return isOnline;
    }
}

module.exports = new OnlineStatusManager();