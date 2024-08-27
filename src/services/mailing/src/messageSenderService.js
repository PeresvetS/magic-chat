// src/services/mailing/src/messageSenderService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, campaignsMailingRepo } = require('../../../db');
const TelegramSessionService = require('../../telegram');

class MessageSenderService {
  constructor() {
    this.limits = {
      telegram: 40,
      whatsapp: 100  // Пример лимита для WhatsApp, уточните реальное значение
    };
  }

  async initialize(phoneSenderNumber) {
    try {
      const session = await TelegramSessionService.createOrGetSession(phoneSenderNumber);
      if (!session.isUserAuthorized()) {
        throw new Error(`Telegram client for ${phoneSenderNumber} is not authenticated. Please authenticate first.`);
      }
      return session;
    } catch (error) {
      logger.error(`Error initializing Telegram client for ${phoneSenderNumber}:`, error);
      throw error;
    }
  }
  

  async sendTelegramMessage(campaignId, phoneRecipientNumber, message) {
    logger.info(`Sending message with campaign ID ${campaignId}`);
    try {
      const phoneSenderNumber = await this.getCampaignSenderNumber(campaignId);
      if (!phoneSenderNumber) {
        throw new Error(`Invalid campaign ID or missing sender phone number for campaign ${campaignId}`);
      }
      
      logger.info(`Sending message to ${phoneRecipientNumber} via Telegram from ${phoneSenderNumber}`);

      const client = await this.initialize(phoneSenderNumber);

      if (!await this.checkDailyLimit(phoneSenderNumber, 'telegram')) {
        logger.warn(`Telegram daily limit reached for phone number: ${phoneSenderNumber}`);
        return { success: false, error: 'Daily limit reached' };
      }

      const user = await client.getEntity(phoneRecipientNumber);
      const result = await client.sendMessage(user, { message: message });

      await this.updateMessageCount(phoneSenderNumber, 'telegram');

      logger.info(`Message sent to ${phoneRecipientNumber} via Telegram from ${phoneSenderNumber}`);
      return { success: true, messageId: result.id };
    } catch (error) {
      logger.error(`Error sending Telegram message for campaign ${campaignId} to ${phoneRecipientNumber}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getCampaignSenderNumber(campaignId) {
    try {
      const phoneNumbers = await campaignsMailingRepo.getCampaignPhoneNumbers(campaignId);
      const phoneSenderNumber = phoneNumbers.find(pn => pn.platform === 'telegram')?.phoneNumber;

      if (!phoneSenderNumber) {
        throw new Error(`No Telegram sender phone number found for campaign ${campaignId}`);
      }

      return phoneSenderNumber;
    } catch (error) {
      logger.error(`Error getting campaign info for campaign ${campaignId}:`, error);
      throw error;
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
