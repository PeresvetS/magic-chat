// src/services/mailing/checkers/TelegramChecker.js

const logger = require('../../../utils/logger');
const TelegramSessionService = require('../../telegram/services/telegramSessionService');
const PhoneNumberRotationService = require('../../phone/src/PhoneNumberRotationService');
const { safeStringify } = require('../../../utils/helpers');

class TelegramChecker {
  constructor() {
    this.clients = new Map();
    this.sessionStubs = new Map();
    this.lastUsedTime = new Map();
    this.phoneNumberRotationService = null;
    this.telegramService = new TelegramSessionService();
  }

  async initialize(campaignId) {
    this.phoneNumberRotationService = new PhoneNumberRotationService(campaignId);
    await this.phoneNumberRotationService.initialize();
    const numbers = await this.phoneNumberRotationService.getAllPhoneNumbers('telegram');
    for (const number of numbers) {
      this.createSessionStub(number.phoneNumber);
    }
  }

  createSessionStub(phoneNumber) {
    this.sessionStubs.set(phoneNumber, true);
  }

  async getOrCreateClient(phoneNumber) {
    if (this.clients.has(phoneNumber)) {
      this.lastUsedTime.set(phoneNumber, Date.now());
      return this.clients.get(phoneNumber);
    }

    if (this.sessionStubs.has(phoneNumber)) {
      const client = await this.telegramService.getOrCreateSession(phoneNumber);
      if (!client) {
        throw new Error(`Failed to get Telegram client for phone number ${phoneNumber}`);
      }
      this.clients.set(phoneNumber, client);
      this.sessionStubs.delete(phoneNumber);
      this.lastUsedTime.set(phoneNumber, Date.now());
      return client;
    }

    throw new Error(`No session stub found for phone number ${phoneNumber}`);
  }

  async check(phoneNumberToCheck) {
    const senderPhoneNumber = await this.phoneNumberRotationService.getNextAvailablePhoneNumber('telegram');
    if (!senderPhoneNumber) {
      logger.error(`No available Telegram phone numbers for checking ${phoneNumberToCheck}`);
      return false;
    }

    logger.info(`Checking Telegram for number ${phoneNumberToCheck} using sender ${senderPhoneNumber}`);
    try {
      const client = await this.getOrCreateClient(senderPhoneNumber);

      logger.info('Updating entity cache...');
      await client.getDialogs({limit: 1});
      logger.info('Entity cache updated');

      const user = await this.telegramService.findUserByPhoneNumber(phoneNumberToCheck, client);
      
      return user !== null;
    } catch (error) {
      if (this.isBanError(error)) {
        const client = await this.getOrCreateClient(senderPhoneNumber);
        await this.handleBanError(senderPhoneNumber, error, client);
        throw error; // Re-throw to allow MessagingPlatformChecker to handle it
      }
      logger.error(`Error checking Telegram for number ${phoneNumberToCheck}:`, error);
      return false;
    }
  }

  isBanError(error) {
    const banErrors = ['USER_DEACTIVATED', 'USER_BANNED', 'PRIVACY_RESTRICTED', 'FLOOD_WAIT', 'RESTRICTED'];
    return banErrors.some(banError => error.message.includes(banError));
  }

  async handleBanError(phoneNumber, error, client) {
    await this.phoneNumberRotationService.handleBanStatus(phoneNumber, error.message, 'telegram', client);
    this.clients.delete(phoneNumber);
    this.lastUsedTime.delete(phoneNumber);
  }

  async disconnect() {
    for (const [phoneNumber, client] of this.clients) {
      await client.disconnect();
    }
    this.clients.clear();
  }

  cleanupCache() {
    const now = Date.now();
    for (const [phoneNumber, client] of this.clients.entries()) {
      const lastUsed = this.lastUsedTime.get(phoneNumber) || 0;
      if (now - lastUsed > 30 * 60 * 1000) { // 30 минут неактивности
        client.disconnect();
        this.clients.delete(phoneNumber);
        this.lastUsedTime.delete(phoneNumber);
      }
    }
  }
}

module.exports = TelegramChecker;
