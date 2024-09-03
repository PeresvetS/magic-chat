// src/services/mailing/src/messagingPlatformChecker.js

const logger = require('../../../utils/logger');
const LeadsService = require('../../leads/src/LeadsService');
const { getPlatformPriority } = require('../../../db').campaignsMailingRepo;
const TelegramChecker = require('./TelegramChecker');
const WhatsAppChecker = require('./WhatsAppChecker');

class MessagingPlatformChecker {
  constructor() {
    this.telegramChecker = TelegramChecker;
    this.whatsappChecker = WhatsAppChecker;
  }

  async initialize() {
    try {
      await this.telegramChecker.initialize();
      await this.whatsappChecker.initialize();

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
    logger.info(`Checking WhatsApp for number ${phoneNumber}`);
    return await this.whatsappChecker.checkWhatsApp(phoneNumber);
  }

  async checkPlatforms(phoneNumber, platform, mode = 'one') {

    let telegramAvailable;
    let whatsappAvailable;

    switch (platform) {
      case 'telegram': {

        telegramAvailable = await this.checkTelegram(phoneNumber);
        if (telegramAvailable) return 'telegram';

        if (mode === 'both') { 
          whatsappAvailable = await this.checkWhatsApp(phoneNumber);
          if (whatsappAvailable) return 'whatsapp';
        } 
        await LeadsService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      case 'whatsapp': {

        whatsappAvailable = await this.checkWhatsApp(phoneNumber);
        if (whatsappAvailable) return 'whatsapp';

        if (mode === 'both') { 
          telegramAvailable = await this.checkTelegram(phoneNumber);
          if (telegramAvailable) return 'telegram';
        } 
        await LeadsService.setLeadUnavailable(phoneNumber);
        return 'none';
      }

      case 'tgwa': {

        telegramAvailable = await this.checkTelegram(phoneNumber);
        whatsappAvailable = await this.checkWhatsApp(phoneNumber);
        if (telegramAvailable && whatsappAvailable) return 'tgwa';
        
        await LeadsService.setLeadUnavailable(phoneNumber);
        return 'none';
      }
      
      default:
        throw new Error('Invalid platform');
    }
  }

  async choosePlatform(campaignId, phoneNumber, platformPriority = null, mode = 'one') {
    logger.info(`Choosing messaging platform for ${phoneNumber} with priority ${platformPriority}`);
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Invalid phone number');
    }

    if (!['telegram', 'whatsapp', 'tgwa'].includes(platformPriority)) {
      logger.warn('Invalid priority platform, getting from DB');
      platformPriority = await getPlatformPriority(campaignId);
    }

    return await this.checkPlatforms(phoneNumber, platformPriority, mode);
  }

  async disconnect() {
    await this.telegramChecker.disconnect();
  }
}

module.exports = new MessagingPlatformChecker();