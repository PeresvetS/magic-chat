// src/services/mailing/checkers/WhatsAppChecker.js

const logger = require('../../../utils/logger');
const { parsePhoneNumber } = require('libphonenumber-js');
const { safeStringify } = require('../../../utils/helpers');
const WhatsAppMainSessionService = require('../../whatsapp/services/WhatsAppMainSessionService');

class WhatsAppChecker {
  constructor() {
    this.mainSessionService = WhatsAppMainSessionService;
  }

  async initialize() {
    // Инициализация не требуется, так как WhatsAppMainSessionService сам управляет инициализацией
    logger.info('WhatsApp checker initialized');
  }

  formatPhoneNumber(phoneNumber) {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, 'ID');
      if (parsedNumber.isValid()) {
        return parsedNumber.format('E.164').slice(1);
      } else {
        logger.warn(`Invalid phone number: ${phoneNumber}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error formatting phone number ${phoneNumber}:`, error);
      return null;
    }
  }

  async checkWhatsApp(phoneNumber, retries = 3) {
    logger.info(`Checking WhatsApp for number ${phoneNumber}`);
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        return false;
      }
      
      const client = await this.mainSessionService.getMainClient();
      if (!client || typeof client !== 'object') {
        throw new Error('Invalid WhatsApp client returned');
      }

      logger.info(`Client type: ${typeof client}, isRegisteredUser: ${typeof client.isRegisteredUser}`);

      if (typeof client.isRegisteredUser !== 'function') {
        throw new Error('isRegisteredUser method not found on WhatsApp client');
      }

      const isRegistered = await client.isRegisteredUser(`${formattedNumber}@c.us`);
      logger.info(`Number ${phoneNumber} WhatsApp status: ${isRegistered ? 'registered' : 'not registered'}`);
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
    // Отключение теперь делегируется WhatsAppMainSessionService
    await this.mainSessionService.disconnectMainClient();
    logger.info('WhatsApp checker disconnected');
  }
}

module.exports = new WhatsAppChecker();