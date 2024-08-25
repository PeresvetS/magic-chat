// src/services/mailing/src/messageSenderService.js

const { getClient } = require('../../auth/authService');
const logger = require('../../../utils/logger');
const { phoneNumberRepo } = require('../../../db');

class MessageSenderService {
  constructor() {
    this.telegramClient = null;
    this.limits = {
      telegram: 40,
      whatsapp: 100  // Пример лимита для WhatsApp, уточните реальное значение
    };
  }

  async initialize() {
    try {
      this.telegramClient = getClient();
    } catch (error) {
      logger.error('Error initializing Telegram client:', error);
      throw new Error('Telegram client is not authenticated. Please authenticate first.');
    }
  }

  async sendTelegramMessage(phoneNumber, message) {
    if (!this.telegramClient) {
      await this.initialize();
    }

    try {
      if (!await this.checkDailyLimit(phoneNumber, 'telegram')) {
        logger.warn(`Telegram daily limit reached for phone number: ${phoneNumber}`);
        return { success: false, error: 'Daily limit reached' };
      }

      const result = await this.telegramClient.sendMessage(phoneNumber, {
        message: message
      });

      await this.updateMessageCount(phoneNumber, 'telegram');

      logger.info(`Message sent to ${phoneNumber} via Telegram`);
      return { success: true, messageId: result.id };
    } catch (error) {
      logger.error(`Error sending Telegram message to ${phoneNumber}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsAppMessage(phoneNumber, message) {
    // Реализация отправки WhatsApp сообщений будет добавлена позже
    logger.warn('WhatsApp sending is not implemented yet');
    return { success: false, error: 'Not implemented' };
  }

  async sendTgAndWa(phoneNumber, message) { 
     // Реализация отправки Telegram и WhatsApp сообщений будет добавлена позже
     logger.warn('Telegram and WhatsApp sending is not implemented yet');
     return { success: false, error: 'Not implemented' };
  }

  async checkDailyLimit(phoneNumber, platform) {
    try {
      const phoneNumberInfo = await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);
      
      if (!phoneNumberInfo) {
        return true; // Если записи нет, считаем что лимит не достигнут
      }
      
      return phoneNumberInfo[`${platform}MessagesSentToday`] < this.limits[platform];
    } catch (error) {
      logger.error(`Error checking daily limit for ${platform}:`, error);
      throw error;
    }
  }

  async updateMessageCount(phoneNumber, platform) {
    try {
      await phoneNumberRepo.updatePhoneNumberStats(phoneNumber, null, false);
    } catch (error) {
      logger.error(`Error updating message count for ${platform}:`, error);
      throw error;
    }
  }
}

module.exports = new MessageSenderService();
