// src/services/whatsapp/onlineStatusManager.js

const whapi = require('@api/whapi');
const logger = require('../../../utils/logger');
const config = require('../../../config');

class OnlineStatusManager {
    constructor() {
      this.onlineUsers = new Map();
      this.timeoutDuration = 20000; // 20 seconds
      whapi.auth(config.WHAPI_TOKEN);
    }
  
    async setOnline(userId) {
      try {
        logger.info(`Setting online status for WhatsApp user ${userId}`);
        if (this.onlineUsers.has(userId)) {
          clearTimeout(this.onlineUsers.get(userId));
          logger.info(`Cleared existing timeout for WhatsApp user ${userId}`);
        }
        this.onlineUsers.set(userId, setTimeout(() => this.setOffline(userId), this.timeoutDuration));
        
        await whapi.sendMePresence({ presence: 'online' });
        
        logger.info(`Online status set for WhatsApp user ${userId}`);
        return true;
      } catch (error) {
        logger.error(`Error setting online status for WhatsApp user ${userId}:`, error);
        throw error;
      }
    }
  
    async setOffline(userId) {
      try {
        logger.info(`Setting offline status for WhatsApp user ${userId}`);
        this.onlineUsers.delete(userId);
        
        await whapi.sendMePresence({ presence: 'offline' });
        
        logger.info(`Offline status set for WhatsApp user ${userId}`);
      } catch (error) {
        logger.error(`Error setting offline status for WhatsApp user ${userId}:`, error);
      }
    }

    async typing(phoneNumber, userId) {
      try {
        await whapi.sendTypingOrRecordingPresence(userId, { presence: 'typing', delay: 5 });
      } catch (error) {
        logger.error(`Error setting typing status: ${error}`);
      }
    }

    isOnline(userId) {
      const isOnline = this.onlineUsers.has(userId);
      logger.info(`Checking online status for WhatsApp user ${userId}: ${isOnline}`);
      return isOnline;
    }
}

module.exports = new OnlineStatusManager();
