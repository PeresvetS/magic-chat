// src/services/mailing/checkers/messagingPlatformChecker.js

const WABAChecker = require('./WABAChecker');
const logger = require('../../../utils/logger');
const TelegramChecker = require('./TelegramChecker');
const WhatsAppChecker = require('./WhatsAppChecker');
const { leadService } = require('../../leads/src/leadService');
const { getPlatformPriority } = require('../../../db').campaignsMailingRepo;

class MessagingPlatformChecker {
  constructor() {
    this.telegramChecker = TelegramChecker;
    this.whatsappChecker = WhatsAppChecker;
    this.wabaChecker = WABAChecker;
  }

  async initialize() {
    try {
      await this.telegramChecker.initialize();
      await this.whatsappChecker.initialize();
      await this.wabaChecker.initialize();
    } catch (error) {
      logger.error('Error initializing checkers:', error);
      throw new Error('Failed to initialize checkers.');
    }
  }

  async checkTelegram(phoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumber}`);
    return await this.telegramChecker.checkTelegram(phoneNumber);
  }

  async checkWhatsApp(phoneNumber) {
    logger.info(`Checking WhatsApp for number ${phoneNumber}`);
    const status = await this.whatsappChecker.checkWhatsApp(phoneNumber);
    return status.canReceiveMessage === true;
  }

  async checkWABA(phoneNumber) {
    logger.info(`Checking WABA for number ${phoneNumber}`);
    return await this.wabaChecker.checkWABA(phoneNumber);
  }

  async checkPlatforms(phoneNumber, platform, mode = 'one') {
    let telegramAvailable;
    let whatsappAvailable;
    let wabaAvailable;

    switch (platform) {
      case 'telegram': {
        telegramAvailable = await this.checkTelegram(phoneNumber);
        if (telegramAvailable) {
          return 'telegram';
        }

        if (mode === 'both') {
          whatsappAvailable = await this.checkWhatsApp(phoneNumber);
          if (whatsappAvailable) {
            return 'whatsapp';
          }
        }
        await leadService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      case 'whatsapp': {
        whatsappAvailable = await this.checkWhatsApp(phoneNumber);
        if (whatsappAvailable) {
          return 'whatsapp';
        }

        if (mode === 'both') {
          telegramAvailable = await this.checkTelegram(phoneNumber);
          if (telegramAvailable) {
            return 'telegram';
          }
        }
        await leadService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      case 'waba': {
        wabaAvailable = await this.checkWABA(phoneNumber);
        if (wabaAvailable) {
          return 'waba';
        }

        if (mode === 'both') {
          telegramAvailable = await this.checkTelegram(phoneNumber);
          if (telegramAvailable) {
            return 'telegram';
          }
        }
        await leadService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      case 'tgwa': {
        const [telegramAvailable, whatsappAvailable] = await Promise.all([
          this.checkTelegram(phoneNumber),
          this.checkWhatsApp(phoneNumber),
        ]);
        if (telegramAvailable && whatsappAvailable) {
          return 'tgwa';
        }
        if (telegramAvailable) {
          return 'telegram';
        }
        if (whatsappAvailable) {
          return 'whatsapp';
        }
        await leadService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      case 'tgwaba': {
        const [telegramAvailable, wabaAvailable] = await Promise.all([
          this.checkTelegram(phoneNumber),
          this.checkWABA(phoneNumber),
        ]);
        if (telegramAvailable && wabaAvailable) {
          return 'tgwaba';
        }
        if (telegramAvailable) {
          return 'telegram';
        }
        if (wabaAvailable) {
          return 'waba';
        }
        await leadService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      default:
        throw new Error('Invalid platform');
    }
  }

  async choosePlatform(
    campaignId,
    phoneNumber,
    platformPriority = null,
    mode = 'one',
  ) {
    logger.info(
      `Choosing messaging platform for ${phoneNumber} with priority ${platformPriority}`,
    );

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Invalid phone number');
    }

    if (
      !['telegram', 'whatsapp', 'waba', 'tgwa', 'tgwaba'].includes(
        platformPriority,
      )
    ) {
      logger.warn('Invalid priority platform, getting from DB');
      platformPriority = await getPlatformPriority(campaignId);
    }

    return await this.checkPlatforms(phoneNumber, platformPriority, mode);
  }

  async disconnect() {
    await this.telegramChecker.disconnect();
    await this.whatsappChecker.disconnect();
    await this.wabaChecker.disconnect();
  }
}

module.exports = new MessagingPlatformChecker();
