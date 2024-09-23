// src/services/mailing/checkers/messagingPlatformChecker.js

const logger = require('../../../utils/logger');
const { getPlatformPriority } = require('../../../db').campaignsMailingRepo;
const { PhoneNumberRotationService } = require('../../phone');
const CheckerFactory = require('./CheckerFactory');
const { leadService } = require('../../leads/src/leadService');
const { phoneNumberService } = require('../../phone');

class MessagingPlatformChecker {
  constructor(campaignId) {
    this.campaignId = campaignId;
    this.checkerFactory = CheckerFactory;
    this.initialized = false;
    this.initializedPlatforms = new Set();
    this.cleanupInterval = null;
  }

  async initialize() {
    if (this.initialized) return;

    await PhoneNumberRotationService.initialize(this.campaignId);
    
    const platformPriority = await getPlatformPriority(this.campaignId);
    const platformsToInitialize = platformPriority.split('');
    
    for (const platform of platformsToInitialize) {
      await this.initializePlatform(platform);
    }

    this.initialized = true;
    this.startCleanupInterval();
  }

  startCleanupInterval() {
    // Запускаем периодическую очистку кэша
    this.cleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000); // Например, каждый час
  }

  cleanupCache() {
    logger.info('Starting cache cleanup');
    for (const platform of this.initializedPlatforms) {
      const checker = this.checkerFactory.getChecker(platform);
      if (typeof checker.cleanupCache === 'function') {
        checker.cleanupCache();
      }
    }
    logger.info('Cache cleanup completed');
  }

  async initializePlatform(platform) {
    if (this.initializedPlatforms.has(platform)) return;

    const numbers = await PhoneNumberRotationService.getAllPhoneNumbers(platform);
    const checker = this.checkerFactory.getChecker(platform);
    await checker.initialize(numbers);

    this.initializedPlatforms.add(platform);
  }

  async checkPlatforms(phoneNumber, platformPriority, mode = 'one') {
    const platforms = platformPriority.split('');
    for (const platform of platforms) {
      const checker = this.checkerFactory.getChecker(platform);
      let result = false;
      let attempts = 0;
      const maxAttempts = 3; // Максимальное количество попыток

      while (!result && attempts < maxAttempts) {
        try {
          result = await checker.check(phoneNumber);
          if (result) {
            return platform;
          }
        } catch (error) {
          if (this.isBanError(error)) {
            await this.handleBanError(platform, error);
          } else {
            logger.error(`Error checking ${platform} for ${phoneNumber}:`, error);
          }
        }
        attempts++;
      }

      if (mode === 'one') break;
    }
    await leadService.setLeadUnavailable(phoneNumber);
    return 'none';
  }

  isBanError(error) {
    const banErrors = ['USER_DEACTIVATED', 'USER_BANNED', 'PRIVACY_RESTRICTED', 'FLOOD_WAIT', 'RESTRICTED'];
    return banErrors.some(banError => error.message.includes(banError));
  }

  async handleBanError(platform, error) {
    const phoneNumber = this.extractPhoneNumberFromError(error);
    if (phoneNumber) {
      await phoneNumberService.updatePhoneNumberBanStatus(phoneNumber, error.message);
    }
  }

  async choosePlatform(phoneNumberToCheck, platformPriority = null, mode = 'one') {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info(`Choosing messaging platform for ${phoneNumberToCheck} with priority ${platformPriority}`);

    if (!phoneNumberToCheck || typeof phoneNumberToCheck !== 'string') {
      throw new Error('Invalid phone number');
    }

    if (!platformPriority || !/^[twa]+$/.test(platformPriority)) {
      logger.warn('Invalid priority platform, getting from DB');
      platformPriority = await getPlatformPriority(this.campaignId);
    }

    return await this.checkPlatforms(phoneNumberToCheck, platformPriority, mode);
  }

  async disconnect() {
    for (const platform of this.initializedPlatforms) {
      const checker = this.checkerFactory.getChecker(platform);
      await checker.disconnect();
    }
    // Останавливаем интервал очистки кэша при отключении
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = MessagingPlatformChecker;
