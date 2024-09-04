// src/services/whatsapp/onlineStatusManager.js

const axios = require('axios');
const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

class OnlineStatusManager {
    constructor() {
      this.onlineUsers = new Map();
      this.timeoutDuration = 20000; // 20 seconds
      this.whapiToken = process.env.WHAPI_TOKEN;
      logger.info('WhatsApp OnlineStatusManager initialized');
    }
  
    async setOnline(userId) {
      try {
        logger.info(`Setting online status for WhatsApp user ${userId}`);
        if (this.onlineUsers.has(userId)) {
          clearTimeout(this.onlineUsers.get(userId));
          logger.info(`Cleared existing timeout for WhatsApp user ${userId}`);
        }
        this.onlineUsers.set(userId, setTimeout(() => this.setOffline(userId), this.timeoutDuration));
        
        await axios.post('https://gate.whapi.cloud/presences/me', {
          presence: 'online'
        }, {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${this.whapiToken}`
          }
        });
        
        logger.info(`Online status set for WhatsApp user ${userId}`);
        return true;
      } catch (error) {
        logger.error(`Error setting online status for WhatsApp user ${userId}:`, safeStringify(error));
        throw error;
      }
    }
  
    async setOffline(userId) {
      try {
        logger.info(`Setting offline status for WhatsApp user ${userId}`);
        this.onlineUsers.delete(userId);
        
        await axios.post('https://gate.whapi.cloud/presences/me', {
          presence: 'offline'
        }, {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${this.whapiToken}`
          }
        });
        
        logger.info(`Offline status set for WhatsApp user ${userId}`);
      } catch (error) {
        logger.error(`Error setting offline status for WhatsApp user ${userId}:`, safeStringify(error));
      }
    }


  isOnline(userId) {
    const isOnline = this.onlineUsers.has(userId);
    logger.info(
      `Checking online status for WhatsApp user ${userId}: ${isOnline}`,
    );
    return isOnline;
  }
}

module.exports = new OnlineStatusManager();
