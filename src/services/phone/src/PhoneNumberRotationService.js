// src/services/phone/src/PhoneNumberRotationService.js

const { getActivePlatformPhoneNumbers, checkDailyPhoneNumberLimit, updatePhoneNumberBanStatus } = require('./phoneNumberService');
const { phoneNumberRotationRepo } = require('../../../db');
const { getUserIdByCampaignId } = require('../../user/src/userService');
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
      this.platformPhoneNumbers[platform] = await getActivePlatformPhoneNumbers(this.userId, platform);
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
    logger.info(`Starting rotation for ${platform} from index ${currentIndex}`);

    let attempts = 0;
    while (attempts < phoneNumbers.length) {
      const phoneNumber = phoneNumbers[currentIndex];
      currentIndex = (currentIndex + 1) % phoneNumbers.length;

      logger.debug(`Checking phone number ${phoneNumber.phoneNumber} for availability`);
      if (this.isPhoneNumberAvailable(phoneNumber)) {
        const isAvailable = await checkDailyPhoneNumberLimit(phoneNumber.phoneNumber, platform);
        if (isAvailable) {
          await phoneNumberRotationRepo.updateRotationState(this.userId, this.campaignId, platform, currentIndex);
          logger.info(`Selected phone number ${phoneNumber.phoneNumber} for ${platform}`);
          return phoneNumber.phoneNumber;
        }
      }

      attempts++;
    }

    logger.error(`No available phone numbers for platform ${platform} after ${attempts} attempts`);
    return null;
  }

  isPhoneNumberAvailable(phoneNumber) {
    const now = new Date();
    return (
      !phoneNumber.banStatus ||
      (phoneNumber.banStatus !== 'USER_DEACTIVATED' &&
       phoneNumber.banStatus !== 'USER_BANNED' &&
       phoneNumber.banStatus !== 'PRIVACY_RESTRICTED') ||
      (phoneNumber.banExpiresAt && phoneNumber.banExpiresAt < now)
    );
  }

  async handleBanStatus(phoneNumber, banStatus, platform, client) {
    let banExpiresAt = null;
    
    if (platform === 'telegram') {
      try {
        const banInfo = await client.invoke(new Api.account.GetBanInfo());
        
        if (banInfo.expires) {
          banExpiresAt = new Date(banInfo.expires * 1000); // Преобразуем Unix timestamp в JavaScript Date
        }
      } catch (error) {
        logger.error(`Error getting ban info from Telegram for ${phoneNumber}:`, error);
      }
    }

    // Если не удалось получить информацию от Telegram или для других платформ
    if (!banExpiresAt) {
      switch (banStatus) {
        case 'FLOOD_WAIT':
          banExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
          break;
        case 'RESTRICTED':
        case 'USER_BANNED':
          banExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours as an example
          break;
        case 'USER_DEACTIVATED':
        case 'PRIVACY_RESTRICTED':
          // These are permanent bans, so we don't set an expiration
          break;
      }
    }

    await updatePhoneNumberBanStatus(phoneNumber, banStatus, banExpiresAt);
    await this.initialize(); // Reinitialize to update available phone numbers
  }
}

module.exports = PhoneNumberRotationService;
