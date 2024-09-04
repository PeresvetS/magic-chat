// src/services/mailing/checkers/telegramChecker.js

const { Api } = require("telegram/tl");
const logger = require('../../../utils/logger');
const { TelegramSessionService } = require('../../telegram');

class TelegramChecker {
  constructor() {
    this.client = null;
  }

  async initialize() {
    if (!this.client) {
      this.client = await TelegramSessionService.getMainClient();
      if (!this.client) {
        throw new Error('Failed to get main Telegram client');
      }
    }
  }

  async checkTelegram(phoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumber}`);
    try {
      await this.initialize();

      const result = await this.client.invoke(
        new Api.contacts.ResolvePhone({
          phone: phoneNumber
        })
      );

      return result.users && result.users.length > 0;
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumber}:`, error);
      return false;
    }
  }

  async disconnect() {
    // Мы не отключаем клиент здесь, так как он управляется TelegramSessionService
    this.client = null;
  }
}

module.exports = new TelegramChecker();