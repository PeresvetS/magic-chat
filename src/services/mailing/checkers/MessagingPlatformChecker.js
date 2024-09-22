// src/services/mailing/checkers/messagingPlatformChecker.js

const WABAChecker = require('./WABAChecker');
const logger = require('../../../utils/logger');
const TelegramChecker = require('./TelegramChecker');
const WhatsAppChecker = require('./WhatsAppChecker');
const { leadService } = require('../../leads/src/leadService');
const { getPlatformPriority } = require('../../../db').campaignsMailingRepo;
const { PhoneNumberRotationService }  = require('../../phone');

class MessagingPlatformChecker {
  constructor() {
    this.telegramChecker = TelegramChecker;
    this.whatsappChecker = WhatsAppChecker;
    this.wabaChecker = WABAChecker;
    this.initialized = false;
    this.initializedPlatforms = new Set();
    this.sessionCache = new Map();
    this.lastUsedTimestamp = new Map();
    this.cleanupInterval = null;
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 минут
    this.CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 минут
  }

  async initialize(campaignId) {
    if (this.initialized) return;

    await PhoneNumberRotationService.initialize(campaignId);
    
    const platformPriority = await getPlatformPriority(campaignId);
    const platformsToInitialize = platformPriority.split('');
    
    for (const platform of platformsToInitialize) {
      await this.initializePlatform(platform, campaignId);
    }

    this.initialized = true;
    this.startCleanupInterval();
  }

  async initializePlatform(platform) {
    if (this.initializedPlatforms.has(platform)) return;

    const numbers = await PhoneNumberRotationService.getAllPhoneNumbers(platform);
    
    switch(platform) {
      case 'telegram':
        // Не инициализируем все сессии сразу, а только создаем заглушки
        for (const number of numbers) {
          this.telegramChecker.createSessionStub(number);
        }
        break;
      case 'whatsapp':
        await this.whatsappChecker.initializeSessions(numbers);
        break;
      case 'waba':
        await this.wabaChecker.initializeSessions(numbers);
        break;
    }

    this.initializedPlatforms.add(platform);
  }

  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupSessions();
    }, this.CLEANUP_INTERVAL);
  }

  async cleanupSessions() {
    const now = Date.now();
    for (const [phoneNumber, lastUsed] of this.lastUsedTimestamp.entries()) {
      if (now - lastUsed > this.SESSION_TIMEOUT) {
        await this.removeSession(phoneNumber);
      }
    }
  }

  async removeSession(phoneNumber) {
    const session = this.sessionCache.get(phoneNumber);
    if (session) {
      try {
        await session.disconnect();
      } catch (error) {
        logger.warn(`Error disconnecting session for ${phoneNumber}:`, error);
      }
    }
    this.sessionCache.delete(phoneNumber);
    this.lastUsedTimestamp.delete(phoneNumber);
    logger.info(`Removed inactive session for ${phoneNumber}`);
  }

  async getOrCreateSession(phoneNumber) {
    if (this.sessionCache.has(phoneNumber)) {
      this.lastUsedTimestamp.set(phoneNumber, Date.now());
      return this.sessionCache.get(phoneNumber);
    }
    const session = await this.telegramChecker.getOrCreateClient(phoneNumber);
    this.sessionCache.set(phoneNumber, session);
    this.lastUsedTimestamp.set(phoneNumber, Date.now());
    return session;
  }

  async checkTelegram(phoneNumberToCheck) {
    if (!this.initialized) {
      throw new Error('MessagingPlatformChecker not initialized');
    }

    const senderPhoneNumber = await PhoneNumberRotationService.getNextAvailablePhoneNumber('telegram');
    if (!senderPhoneNumber) {
      logger.error(`No available Telegram phone numbers for checking ${phoneNumberToCheck}`);
      throw new Error('No available Telegram phone numbers');
    }

    logger.info(`Checking Telegram for number ${phoneNumberToCheck} using sender ${senderPhoneNumber}`);
    
    const session = await this.getOrCreateSession(senderPhoneNumber);
    return await this.telegramChecker.checkTelegram(phoneNumberToCheck, senderPhoneNumber, session);
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
        [telegramAvailable, whatsappAvailable] = await Promise.all([
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
        [telegramAvailable, wabaAvailable] = await Promise.all([
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
    phoneNumberToCheck,
    platformPriority = null,
    mode = 'one'
  ) {
    if (!this.initialized) {
      await this.initialize(campaignId);
    }

    logger.info(
      `Choosing messaging platform for ${phoneNumberToCheck} with priority ${platformPriority}`,
    );

    if (!phoneNumberToCheck || typeof phoneNumberToCheck !== 'string') {
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

    return await this.checkPlatforms(phoneNumberToCheck, platformPriority, mode);
  }

  async disconnect() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    for (const [phoneNumber, session] of this.sessionCache.entries()) {
      await this.removeSession(phoneNumber);
    }
    await this.telegramChecker.disconnect();
    await this.whatsappChecker.disconnect();
    await this.wabaChecker.disconnect();
  }
}

module.exports = new MessagingPlatformChecker();
