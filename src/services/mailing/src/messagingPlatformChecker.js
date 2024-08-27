// src/services/mailing/src/messagingPlatformChecker.js

const logger = require('../../../utils/logger');
const { gePlatformPriority } = require('../../../db').campaignsMailingRepo;
const TelegramChecker = require('./TelegramChecker');

class MessagingPlatformChecker {
  constructor() {
    this.telegramChecker = TelegramChecker;
  }

  async initialize() {
    try {
      await this.telegramChecker.initialize();
    } catch (error) {
      logger.error('Error initializing Telegram checker:', error);
      throw new Error('Failed to initialize Telegram checker.');
    }
  }

  async checkTelegram(phoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumber}`);
    return await this.telegramChecker.checkTelegram(phoneNumber);
  }

  async checkWhatsApp(phoneNumber) {
    // Implementation for WhatsApp check
    logger.warn('WhatsApp checking is not implemented yet');
    return false;
  }

  async checkPlatforms(phoneNumber, platform) {
    switch (platform) {
      case 'telegram':
        return await this.checkTelegram(phoneNumber);
      case 'whatsapp':
        return await this.checkWhatsApp(phoneNumber);
      case 'tgwa':
        return await this.checkTelegram(phoneNumber) && await this.checkWhatsApp(phoneNumber);
      default:
        throw new Error('Invalid platform');
    }
  }

  async choosePlatform(campaignId,phoneNumber, priorityPlatform = null) {
    logger.info(`Choosing messaging platform for ${phoneNumber} with priority ${priorityPlatform}`);
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Invalid phone number');
    }

    if (!['telegram', 'whatsapp', 'tgwa'].includes(priorityPlatform)) {
      logger.warn('Invalid priority platform, getting from DB');
      priorityPlatform = await gePlatformPriority(campaignId);
    }

    const telegramAvailable = await this.checkTelegram(phoneNumber);
    const whatsappAvailable = await this.checkWhatsApp(phoneNumber);

    if (priorityPlatform === 'telegram' && telegramAvailable) return 'telegram';
    if (priorityPlatform === 'whatsapp' && whatsappAvailable) return 'whatsapp';
    if (priorityPlatform === 'tgwa' && telegramAvailable && whatsappAvailable) return 'tgwa';

    if (telegramAvailable) return 'telegram';
    if (whatsappAvailable) return 'whatsapp';

    return 'none';
  }

  async disconnect() {
    await this.telegramChecker.disconnect();
  }
}

module.exports = new MessagingPlatformChecker();