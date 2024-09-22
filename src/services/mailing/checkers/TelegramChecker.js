// src/services/mailing/checkers/TelegramChecker.js

const logger = require('../../../utils/logger');
const telegramSessionService = require('../../telegram/services/telegramSessionService');
const { PhoneNumberRotationService } = require('../../phone');

class TelegramChecker {
  constructor() {
    this.clients = new Map();
    this.sessionStubs = new Map();
  }

  async initialize(numbers) {
    for (const number of numbers) {
      this.createSessionStub(number);
    }
  }

  createSessionStub(phoneNumber) {
    this.sessionStubs.set(phoneNumber, true);
  }

  async getOrCreateClient(phoneNumber) {
    if (this.clients.has(phoneNumber)) {
      return this.clients.get(phoneNumber);
    }

    if (this.sessionStubs.has(phoneNumber)) {
      const client = await telegramSessionService.getOrCreateSession(phoneNumber);
      if (!client) {
        throw new Error(`Failed to get Telegram client for phone number ${phoneNumber}`);
      }
      this.clients.set(phoneNumber, client);
      this.sessionStubs.delete(phoneNumber);
      return client;
    }

    throw new Error(`No session stub found for phone number ${phoneNumber}`);
  }

  async check(phoneNumberToCheck) {
    const senderPhoneNumber = await PhoneNumberRotationService.getNextAvailablePhoneNumber('telegram');
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

      const user = await telegramSessionService.findUserByPhoneNumber(phoneNumberToCheck, client);
      
      return user !== null;
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumberToCheck}:`, error);
      return false;
    }
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
      if (now - client.lastUsed > 30 * 60 * 1000) { // 30 минут неактивности
        client.disconnect();
        this.clients.delete(phoneNumber);
      }
    }
  }
}

module.exports = TelegramChecker;
