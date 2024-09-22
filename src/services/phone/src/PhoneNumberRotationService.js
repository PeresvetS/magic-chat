const { phoneNumberService } = require('./phoneNumberService');
const { phoneNumberRotationRepo } = require('../../../db');
const { getUserIdByCampaignId } = require('../../user').userService;
const logger = require('../../../utils/logger');

class PhoneNumberRotationService {
  constructor(campaignId) {
    this.userId = '';
    this.campaignId = campaignId;
    this.platformPhoneNumbers = {
      telegram: [],
      whatsapp: [],
      waba: []
    };
  }

  async initialize() {
    this.userId = await getUserIdByCampaignId(this.campaignId);
    for (const platform of ['telegram', 'whatsapp', 'waba']) {
      this.platformPhoneNumbers[platform] = await phoneNumberService.getCampaignPhoneNumbers(this.campaignId, platform);
      const rotationState = await phoneNumberRotationRepo.getRotationState(this.userId, this.campaignId, platform);
      if (!rotationState) {
        await phoneNumberRotationRepo.updateRotationState(this.userId, this.campaignId, platform, 0);
      }
    }
  }

  async getNextAvailablePhoneNumber(platform) {
    const phoneNumbers = this.platformPhoneNumbers[platform];
    if (phoneNumbers.length === 0) {
      logger.error(`No phone numbers available for platform ${platform}`);
      return null;
    }

    let rotationState = await phoneNumberRotationRepo.getRotationState(this.userId, this.campaignId, platform);
    let currentIndex = rotationState ? rotationState.currentIndex : 0;

    let attempts = 0;
    while (attempts < phoneNumbers.length) {
      const phoneNumber = phoneNumbers[currentIndex];
      currentIndex = (currentIndex + 1) % phoneNumbers.length;

      const isAvailable = await phoneNumberService.checkDailyPhoneNumberLimit(phoneNumber, platform);
      if (isAvailable) {
        await phoneNumberRotationRepo.updateRotationState(this.userId, this.campaignId, platform, currentIndex);
        return phoneNumber;
      }

      attempts++;
    }

    logger.error(`No available phone numbers for platform ${platform}`);
    return null;
  }
}

module.exports = PhoneNumberRotationService;
