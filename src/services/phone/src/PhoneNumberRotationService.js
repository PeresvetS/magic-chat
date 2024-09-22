// src/services/mailing/services/PhoneNumberRotationService.js

const { phoneNumberService } = require('./phoneNumberService');
const logger = require('../../../utils/logger');

class PhoneNumberRotationService {
  constructor() {
    this.platformPhoneNumbers = {
      telegram: [],
      whatsapp: [],
      waba: []
    };
    this.currentIndex = {
      telegram: 0,
      whatsapp: 0,
      waba: 0
    };
  }

  async initialize(campaignId) {
    for (const platform of ['telegram', 'whatsapp', 'waba']) {
      this.platformPhoneNumbers[platform] = await phoneNumberService.getCampaignPhoneNumbers(campaignId, platform);
      this.currentIndex[platform] = 0;
    }
  }

  async getNextAvailablePhoneNumber(platform) {
    const phoneNumbers = this.platformPhoneNumbers[platform];
    if (phoneNumbers.length === 0) {
      logger.error(`No phone numbers available for platform ${platform}`);
    }

    let attempts = 0;
    while (attempts < phoneNumbers.length) {
      const phoneNumber = phoneNumbers[this.currentIndex[platform]];
      this.currentIndex[platform] = (this.currentIndex[platform] + 1) % phoneNumbers.length;

      const isAvailable = await phoneNumberService.checkDailyPhoneNumberLimit(phoneNumber, platform);
      if (isAvailable) {
        return phoneNumber;
      }

      attempts++;
    }

    logger.error(`No available phone numbers for platform ${platform}`);
    return null;
  }
}

module.exports = new PhoneNumberRotationService();
