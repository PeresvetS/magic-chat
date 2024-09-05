// src/services/whatsapp/onlineStatusManager.js

const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

class OnlineStatusManager {
    constructor() {
      this.onlineUsers = new Map();
      this.timeoutDuration = 20000; // 20 seconds
      logger.info('WhatsApp OnlineStatusManager initialized');
    }
  
    async setOnline(userId, client) {
      try {
        logger.info(`Setting online status for WhatsApp user ${userId}`);
        if (this.onlineUsers.has(userId)) {
          clearTimeout(this.onlineUsers.get(userId));
          logger.info(`Cleared existing timeout for WhatsApp user ${userId}`);
        }
        this.onlineUsers.set(userId, setTimeout(() => this.setOffline(userId, client), this.timeoutDuration));
        await client.sendPresenceAvailable();
        logger.info(`Online status set for WhatsApp user ${userId}`);
        return true;
      } catch (error) {
        logger.error(`Error setting online status for WhatsApp user ${userId}:`, safeStringify(error));
        throw error;
      }
    }
  
    async setOffline(userId, client) {
      try {
        logger.info(`Setting offline status for WhatsApp user ${userId}`);
        this.onlineUsers.delete(userId);
        await client.sendPresenceUnavailable();
        logger.info(`Offline status set for WhatsApp user ${userId}`);
      } catch (error) {
        logger.error(`Error setting offline status for WhatsApp user ${userId}:`, safeStringify(error));
      }
    }
  
    isOnline(userId) {
      const isOnline = this.onlineUsers.has(userId);
      logger.info(`Checking online status for WhatsApp user ${userId}: ${isOnline}`);
      return isOnline;
    }
}

module.exports = new OnlineStatusManager();