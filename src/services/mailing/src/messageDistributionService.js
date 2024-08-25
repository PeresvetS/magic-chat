// src/services//maiiling/messageDistributionService.js

const messageSenderService = require('./messageSenderService');
const messagingPlatformChecker = require('./messagingPlatformChecker');
const logger = require('../../../utils/logger');

class MessageDistributionService {
  async distributeMessage(phoneNumber, message) {
    try {
      const platforms = await messagingPlatformChecker.checkPlatforms(phoneNumber);

      let results = {
        phoneNumber,
        telegram: null,
        whatsapp: null
      };

      if (platforms.hasTelegram) {
        results.telegram = await messageSenderService.sendTelegramMessage(phoneNumber, message);
      }

      if (platforms.hasWhatsApp) {
        results.whatsapp = await messageSenderService.sendWhatsAppMessage(phoneNumber, message);
      }

      if (!platforms.hasTelegram && !platforms.hasWhatsApp) {
        logger.warn(`No messaging platforms available for ${phoneNumber}`);
      }

      return results;
    } catch (error) {
      logger.error(`Error distributing message to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async bulkDistribute(contacts, message) {
    const results = [];
    for (const contact of contacts) {
      try {
        const result = await this.distributeMessage(contact.phoneNumber, message);
        results.push(result);
      } catch (error) {
        logger.error(`Error in bulk distribution for ${contact.phoneNumber}:`, error);
        results.push({
          phoneNumber: contact.phoneNumber,
          error: error.message
        });
      }
    }
    return results;
  }
}

module.exports = new MessageDistributionService();