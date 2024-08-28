// src/services/mailing/src/messageSenderService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, campaignsMailingRepo, dialogRepo } = require('../../../db');
const { TelegramSessionService } = require('../../telegram');

class MessageSenderService {
  constructor() {
    this.limits = {
      telegram: 40, // определять через БД
      whatsapp: 100  // Пример лимита для WhatsApp,
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
    logger.info(`Отправка сообщения с ID кампании ${campaignId}`);
    try {
      const userId = await this.getCampaigUserId(campaignId);
      logger.info(`Отправка рассылки от пользователя ID с ${userId}`);
      const phoneSenderNumber = await this.getCampaignSenderNumber(campaignId, 'telegram');

      if (!phoneSenderNumber) {
        throw new Error(`Недействительный ID кампании или отсутствует номер отправителя для кампании ${campaignId}`);
      }

      logger.info(`Отправка сообщения на ${phoneRecipientNumber} через Telegram с ${phoneSenderNumber}`);

      const client = await this.initialize(phoneSenderNumber);

      if (!await this.checkDailyLimit(phoneSenderNumber, 'telegram')) {
        logger.warn(`Достигнут дневной лимит Telegram для номера телефона: ${phoneSenderNumber}`);
        return { success: false, error: 'Достигнут дневной лимит' };
      }

      const recipient = await client.getEntity(phoneRecipientNumber);
      const result = await client.sendMessage(recipient, { message: message });

      const isNewContact = await this.isNewContact(userId, recipient.id, 'telegram');
      await this.updateMessageCount(phoneSenderNumber, isNewContact, 'telegram');
      await this.saveDialog(userId, recipient.id, 'telegram', '', message , phoneRecipientNumber);
      logger.info(`Сообщение отправлено на ${phoneRecipientNumber} через Telegram с ${phoneSenderNumber}`);
      return { success: true, messageId: result.id };
    } catch (error) {
      logger.error(`Ошибка отправки сообщения Telegram для кампании ${campaignId} на ${phoneRecipientNumber}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getCampaignSenderNumber(campaignId, platform = 'telegram') {
    try {
      const phoneNumbers = await campaignsMailingRepo.getCampaignPhoneNumbers(campaignId);
      const phoneSenderNumber = phoneNumbers.find(pn => pn.platform === platform)?.phoneNumber;

      if (!phoneSenderNumber) {
        throw new Error(`No ${platform} sender phone number found for campaign ${campaignId}`);
      }

      return phoneSenderNumber;
    } catch (error) {
      logger.error(`Error getting campaign sender number for campaign ${campaignId}:`, error);
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

      switch (platform) {
        case 'telegram':
          if (!phoneNumberInfo.telegramAccount) {
            throw new Error(`No Telegram account found for phone number ${phoneNumber}`);
          }
          return phoneNumberInfo.telegramAccount.contactsReachedToday < phoneNumberInfo.telegramAccount.dailyLimit;
        case 'whatsapp':
          if (!phoneNumberInfo.whatsappAccount) {
            throw new Error(`No WhatsApp account found for phone number ${phoneNumber}`);
          }
          return phoneNumberInfo.whatsappAccount.contactsReachedToday < phoneNumberInfo.whatsappAccount.dailyLimit;
        default:
          throw new Error(`Invalid platform: ${platform}`);
      }
    } catch (error) {
      logger.error(`Error checking daily limit for ${platform}:`, error);
      throw error;
    }
  }

  async updateMessageCount(phoneSenderNumber, isNewContact, platform) {
    try {
      await phoneNumberRepo.updatePhoneNumberStats(phoneSenderNumber, isNewContact, platform);
    } catch (error) {
      logger.error(`Ошибка обновления счетчика сообщений для ${platform}:`, error);
      throw error;
    }
  }

  async saveDialog(userId, contactId, platform, userRequest, assistantResponse, phoneRecipientNumber) {
    try {
      await dialogRepo.saveMessage(userId, Number(contactId), platform, userRequest, assistantResponse, phoneRecipientNumber);
    } catch (error) {
      logger.error(`Ошибка сохранения диалога:`, error);
      throw error;
    }
  }

  async getCampaigUserId(campaignId) {
    try {
      const userId = await campaignsMailingRepo.getCampaigUserId(campaignId);
      if (!userId) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      return userId;
    } catch (error) {
      logger.error(`Error getting campaign user ID for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async isNewContact(userId, contactId, platform) {
    try {
      const existingDialog = await dialogRepo.getDialog(userId, Number(contactId), platform);
      return !existingDialog;
    } catch (error) {
      logger.error(`Ошибка при проверке, является ли контакт новым:`, error);
      throw error;
    }
  }
}

module.exports = new MessageSenderService();
