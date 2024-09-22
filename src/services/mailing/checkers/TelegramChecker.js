// src/services/mailing/checkers/telegramChecker.js

const logger = require('../../../utils/logger');
const telegramSessionService = require('../../telegram/services/telegramSessionService');

class TelegramChecker {
  constructor() {
    this.clients = new Map();
    this.sessionStubs = new Map();
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

  async checkTelegram(phoneNumberToCheck, senderPhoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumberToCheck} using sender ${senderPhoneNumber}`);
    try {
      const client = await this.getOrCreateClient(senderPhoneNumber);

      // Обновляем кэш сущностей
      logger.info('Updating entity cache...');
      await client.getDialogs({limit: 1});
      logger.info('Entity cache updated');

      const user = await telegramSessionService.findUserByPhoneNumber(phoneNumberToCheck, client);
      
      // // Обновляем статистику использования номера отправителя
      // await phoneNumberService.updatePhoneNumberStats(senderPhoneNumber, user !== null, 'telegram');

      return user !== null;
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumberToCheck}:`, error);
      return false;
    }
  }

  async disconnect(phoneNumber) {
    if (this.clients.has(phoneNumber)) {
      const client = this.clients.get(phoneNumber);
      await client.disconnect();
      this.clients.delete(phoneNumber);
    }
  }

  async disconnectAll() {
    for (const [phoneNumber, client] of this.clients) {
      await client.disconnect();
    }
    this.clients.clear();
  }
}

module.exports = new TelegramChecker();
