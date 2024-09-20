// src/services/mailing/checkers/telegramChecker.js

const { Api } = require('telegram/tl');
const logger = require('../../../utils/logger');
const { TelegramMainSessionService } = require('../../telegram');
const telegramSessionService = require('../../telegram/services/telegramSessionService');

class TelegramChecker {
  constructor() {
    this.client = null;
  }

  async initialize() {
    if (!this.client) {
      this.client = await TelegramMainSessionService.getMainClient();
      if (!this.client) {
        throw new Error('Failed to get main Telegram client');
      }
    }
  }

  async checkTelegram(phoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumber}`);
    try {
      await this.initialize();

      // Обновляем кэш сущностей
      logger.info('Updating entity cache...');
      await this.client.getDialogs({limit: 1});
      logger.info('Entity cache updated');

      const user = await telegramSessionService.findUserByPhoneNumber(phoneNumber, this.client);
      return user !== null;
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
