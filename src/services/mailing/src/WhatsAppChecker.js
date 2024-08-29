// src/services/mailing/src/WhatsAppChecker.js

const logger = require('../../../utils/logger');
const WhatsAppMainSessionService = require('../../whatsapp').WhatsAppMainSessionService;

class WhatsAppChecker {
  constructor() {
    this.client = null;
    this.whatsAppMainSessionService = WhatsAppMainSessionService;
  }

  async initialize() {
    if (!this.client) {
      logger.info('Initializing WhatsApp main client');
      this.client = await this.whatsAppMainSessionService.getMainClient();
      if (!this.client) {
        throw new Error('Failed to get main WhatsApp client');
      }
    }
  }

  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.startsWith('62') ? cleaned : `62${cleaned}`;
  }


  async checkWhatsApp(phoneNumber) {
    logger.info(`Checking WhatsApp for number ${phoneNumber}`);
    try {
      await this.initialize();

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      logger.info(`Formatted number for WhatsApp check: ${formattedNumber}`);

      const numberDetails = await Promise.race([
        this.client.getNumberId(formattedNumber),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getNumberId timeout')), 10000))
      ]);

      logger.info(`Number details for ${formattedNumber}:`, numberDetails);
      return numberDetails !== null;
    } catch (error) {
      logger.error(`Error checking WhatsApp for number ${phoneNumber}:`, error);
      return false;
    }
  }   

  async disconnect() {
    if (this.client) {
      logger.info('Disconnecting WhatsApp client');
      await this.whatsAppMainSessionService.disconnectMainClient();
      this.client = null;
    }
  }
}

module.exports = new WhatsAppChecker();