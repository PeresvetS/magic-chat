// src/services/mailing/checkers/WABAChecker.js

const { parsePhoneNumber } = require('libphonenumber-js');
const axios = require('axios');

const logger = require('../../../utils/logger');
const WABASessionService = require('../../waba/services/WABASessionService');

class WABAChecker {
  constructor() {
    this.wabaSessionService = WABASessionService;
  }

  async initialize() {
    // Инициализация, если необходимо
    logger.info('Initializing WABA checker');
  }

  formatPhoneNumber(phoneNumber) {
    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, 'ID'); // 'ID' - код страны по умолчанию
      if (parsedNumber.isValid()) {
        return parsedNumber.format('E.164').slice(1); // Удаляем начальный '+'
      }
      logger.warn(`Invalid phone number: ${phoneNumber}`);
      return null;
    } catch (error) {
      logger.error(`Error formatting phone number ${phoneNumber}:`, error);
      return null;
    }
  }

  async checkWABA(phoneNumber, retries = 3) {
    logger.info(`Checking WABA for number ${phoneNumber}`);
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        throw new Error(`Invalid phone number format: ${phoneNumber}`);
      }
      logger.info(`Formatted number for WABA check: ${formattedNumber}`);

      const session =
        await this.wabaSessionService.createOrGetSession(formattedNumber);
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${session.wabaPhoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'contacts',
          contacts: [{ phone: formattedNumber }],
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const isRegistered = response.data.contacts[0].wa_id !== undefined;
      logger.info(
        `Is number ${formattedNumber} registered on WABA: ${isRegistered}`,
      );
      return isRegistered;
    } catch (error) {
      logger.error(`Error checking WABA for number ${phoneNumber}:`, error);
      if (retries > 0) {
        logger.info(
          `Retrying WABA check for ${phoneNumber}. Retries left: ${retries - 1}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.checkWABA(phoneNumber, retries - 1);
      }
      return false;
    }
  }

  async disconnect() {
    // Отключение, если необходимо
    logger.info('Disconnecting WABA checker');
  }
}

module.exports = new WABAChecker();
