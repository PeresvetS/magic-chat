// src/services/mailing/src/WhatsAppChecker.js

const logger = require('../../../utils/logger');
const { parsePhoneNumber } = require('libphonenumber-js')
const WhatsAppMainSessionService = require('../../whatsapp').WhatsAppMainSessionService;

class WhatsAppChecker {
  constructor() {
    this.client = null;
    this.whatsAppMainSessionService = WhatsAppMainSessionService;
  }

  async initialize() {
    if (!this.client) {
      logger.info('Initializing WhatsApp main client');
      try {
        this.client = await this.whatsAppMainSessionService.getMainClient();
        if (!this.client) {
          throw new Error('Failed to get main WhatsApp client');
        }
        logger.info('WhatsApp main client initialized successfully');
      } catch (error) {
        logger.error('Error initializing WhatsApp main client:', error);
        throw error;
      }
    } else {
      logger.info('WhatsApp main client already initialized');
    }
  }

  formatPhoneNumber(phoneNumber) {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, 'ID') // 'ID' - код страны по умолчанию
      if (parsedNumber.isValid()) {
        return parsedNumber.format('E.164').slice(1) // Удаляем начальный '+'
      } else {
        logger.warn(`Invalid phone number: ${phoneNumber}`)
        return null
      }
    } catch (error) {
      logger.error(`Error formatting phone number ${phoneNumber}:`, error)
      return null
    }
  }


  async checkWhatsApp(phoneNumber, retries = 3) {
    logger.info(`Checking WhatsApp for number ${phoneNumber}`);
    try {
      await this.initialize();
  
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      logger.info(`Formatted number for WhatsApp check: ${formattedNumber}`);
  
      const isRegistered = await Promise.race([
        this.client.isRegisteredUser(`${formattedNumber}@c.us`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('isRegisteredUser timeout')), 30000))
      ]);
  
      logger.info(`Is number ${formattedNumber} registered on WhatsApp: ${isRegistered}`);
      return isRegistered;
    } catch (error) {
      logger.error(`Error checking WhatsApp for number ${phoneNumber}:`, error);
      if (retries > 0) {
        logger.info(`Retrying WhatsApp check for ${phoneNumber}. Retries left: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.checkWhatsApp(phoneNumber, retries - 1);
      }
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