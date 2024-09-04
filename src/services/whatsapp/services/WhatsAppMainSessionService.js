// src/services/whatsapp/src/WhatsAppMainSessionService.js

const logger = require('../../../utils/logger');
const axios = require('axios');

const logger = require('../../../utils/logger');
const config = require('../../../config');

class WhatsAppMainSessionService {
  constructor() {
    this.whapiToken = process.env.WHAPI_TOKEN;
    this.client = null;
  }

  async getMainClient() {
    if (!this.client) {
      this.client = {
        isRegisteredUser: async (userId) => {
          try {
            const response = await axios.get(`https://gate.whapi.cloud/contacts/${userId}/profile`, {
              headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${this.whapiToken}`
              }
            });
            return response.status === 200;
          } catch (error) {
            logger.error(`Error checking if user is registered: ${error}`);
            return false;
          }
        },
        // Добавьте здесь другие методы, которые вам могут понадобиться
      };
    }
    return this.client;
  }
}

module.exports = new WhatsAppMainSessionService();
