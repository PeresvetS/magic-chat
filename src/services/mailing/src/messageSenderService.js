// src/services/maiiling/messageSenderService.js

const { getClient } = require('../../auth/authService');
const logger = require('../../../utils/logger');
const db = require('../../../db/postgres/config');

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

  async checkDailyLimit(phoneNumber, platform) {
    const client = await db.connect();
    try {
      const query = `
        SELECT ${platform}_messages_sent_today 
        FROM phone_numbers 
        WHERE phone_number = $1
      `;
      const result = await client.query(query, [phoneNumber]);
      
      if (result.rows.length === 0) {
        return true; // Если записи нет, считаем что лимит не достигнут
      }
      
      return result.rows[0][`${platform}_messages_sent_today`] < this.limits[platform];
    } catch (error) {
      logger.error(`Error checking daily limit for ${platform}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMessageCount(phoneNumber, platform) {
    const client = await db.connect();
    try {
      const query = `
        INSERT INTO phone_numbers (
          phone_number, 
          ${platform}_messages_sent_today, 
          ${platform}_messages_sent_total
        )
        VALUES ($1, 1, 1)
        ON CONFLICT (phone_number) 
        DO UPDATE SET 
          ${platform}_messages_sent_today = phone_numbers.${platform}_messages_sent_today + 1,
          ${platform}_messages_sent_total = phone_numbers.${platform}_messages_sent_total + 1
      `;
      await client.query(query, [phoneNumber]);
    } catch (error) {
      logger.error(`Error updating message count for ${platform}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new MessageSenderService();