// src/services/mailling/src/messagingPlatformChecker.js

const { TelegramClient } = require("telegram");
const { Api } = require("telegram/tl");
const { StringSession } = require("telegram/sessions");
const config = require('../../../config');
const logger = require('../../../utils/logger');
const { getClient } = require('../../auth/authService');
const { gePlatformPriority } = require('../../../db').campaignsMailingRepo;

class MessagingPlatformChecker {
  constructor() {
    this.telegramClient = null;
  }

  async initialize() {
    try {
      this.telegramClient = getClient();
    } catch (error) {
      logger.error('Error initializing Telegram client:', error);
      throw new Error('Telegram client is not authenticated. Please authenticate first.');
    }
  }

  async checkTelegram(phoneNumber) {
    if (!this.telegramClient) {
      await this.initialize();
    }

    try {
      const result = await this.telegramClient.invoke(
        new Api.contacts.ResolvePhone({
          phone: phoneNumber
        })
      );

      if (result.users && result.users.length > 0) {
        logger.info(`Telegram account found for number: ${phoneNumber}`);
        return true;
      } else {
        logger.info(`No Telegram account found for number: ${phoneNumber}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumber}:`, error);
      return false;
    }
  }

  async checkWhatsApp(phoneNumber) {
    // Примечание: Проверка WhatsApp может потребовать использования стороннего API
    // или специфических методов, которые могут нарушать условия использования WhatsApp.
    // Здесь мы оставим заглушку для будущей реализации.
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

  async choosePlatform(phoneNumber, priorityPlatform = null) {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      } 
      else if (typeof phoneNumber !== 'string') {
        throw new Error('Phone number must be a string');
      }
      if (!priorityPlatform) {
        priorityPlatform = await gePlatformPriority(phoneNumber);
        logger.info(`No priority platform provided. Got from DB ${priorityPlatform}.`);
      }

      if (priorityPlatform !== 'telegram' && priorityPlatform !== 'whatsapp' && priorityPlatform !== 'tgwa') {
        throw new Error('Invalid priority platform');
      }

      if (priorityPlatform === 'telegram' && checkPlatforms(phoneNumber, 'telegram')) {
        return 'telegram';
      } 
      else if (priorityPlatform === 'whatsapp' && checkPlatforms(phoneNumber, 'whatsapp')) {
        return 'whatsapp';
      } 
      else if (priorityPlatform === 'tgwa' && checkPlatforms(phoneNumber, 'tgwa')) {
        return 'tgwa';
      }
      else {
        return 'none';
      }
  }

}

module.exports = new MessagingPlatformChecker();