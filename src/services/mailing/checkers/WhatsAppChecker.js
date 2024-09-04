// Файл: /src/services/mailing/checkers/WhatsAppChecker.js

const logger = require('../../../utils/logger');
const { parsePhoneNumber } = require('libphonenumber-js');
const axios = require('axios');

class WhatsAppChecker {
  constructor() {
    this.whapiToken = process.env.WHAPI_TOKEN;
  }

  async initialize() {
    logger.info('WhatsApp checker initialized');
  }

  formatPhoneNumber(phoneNumber) {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, 'ID')
      if (parsedNumber.isValid()) {
        return parsedNumber.format('E.164').slice(1)
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
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      logger.info(`Formatted number for WhatsApp check: ${formattedNumber}`);
  
      const response = await axios.get(`https://gate.whapi.cloud/contacts/${formattedNumber}/profile`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${this.whapiToken}`
        }
      });
  
      const isRegistered = response.status === 200;
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
}

module.exports = new WhatsAppChecker();