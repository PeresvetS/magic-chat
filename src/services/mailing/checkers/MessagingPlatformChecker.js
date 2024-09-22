// src/services/mailing/checkers/messagingPlatformChecker.js

const logger = require('../../../utils/logger');
const { getPlatformPriority } = require('../../../db').campaignsMailingRepo;
const { PhoneNumberRotationService } = require('../../phone');
const CheckerFactory = require('./CheckerFactory');
const { leadService } = require('../../leads/src/leadService');

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
      const result = await checker.check(phoneNumber);
      if (result) {
        return platform;
      }
      if (mode === 'one') break;
    }
    await leadService.setLeadUnavailable(phoneNumber);
    return 'none';
  }

  async choosePlatform(phoneNumberToCheck, platformPriority = null, mode = 'one') {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.info(`Choosing messaging platform for ${phoneNumberToCheck} with priority ${platformPriority}`);

    if (!phoneNumberToCheck || typeof phoneNumberToCheck !== 'string') {
      throw new Error('Invalid phone number');
    }

    if (!['telegram', 'whatsapp', 'waba', 'tgwa', 'tgwaba'].includes(platformPriority)) {
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
