// src/services/mailing/src/messageSenderService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, campaignsMailingRepo, dialogRepo } = require('../../../db');
const { TelegramSessionService } = require('../../telegram');
const { WhatsAppSessionService } = require('../../whatsapp');

class MessageSenderService {
  constructor() {
    this.limits = {
      telegram: 40, // определять через БД
      whatsapp: 100  // Пример лимита для WhatsApp,
    };
  }

  async initializeTelegram(phoneSenderNumber) {
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

  async initializeWhatsApp(phoneSenderNumber) {
    try {
      const client = await WhatsAppSessionService.createOrGetSession(phoneSenderNumber);
      if (!client.isReady) {
        logger.warn(`WhatsApp client for ${phoneSenderNumber} is not ready. Waiting for ready state.`);
        await new Promise((resolve, reject) => {
          const readyTimeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for WhatsApp client to be ready for ${phoneSenderNumber}`));
          }, 30000); // 30 секунд таймаут
  
          client.on('ready', () => {
            clearTimeout(readyTimeout);
            logger.info(`WhatsApp client for ${phoneSenderNumber} is now ready.`);
            resolve();
          });
        });
      }
      return client;
    } catch (error) {
      logger.error(`Error initializing WhatsApp client for ${phoneSenderNumber}:`, error);
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

      const client = await this.initializeTelegram(phoneSenderNumber);

      if (!await this.checkDailyLimit(phoneSenderNumber, 'telegram')) {
        logger.warn(`Достигнут дневной лимит Telegram для номера телефона: ${phoneSenderNumber}`);
        return { success: false, error: 'Достигнут дневной лимит' };
      }

      const recipient = await client.getEntity(phoneRecipientNumber);
      if (!recipient) {
        throw new Error(`Не удалось найти пользователя ${phoneRecipientNumber} в Telegram`);
      }
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

  async sendWhatsAppMessage(campaignId, phoneRecipientNumber, message) {
    logger.info(`Отправка сообщения с ID кампании ${campaignId}`);
    try {
      const userId = await this.getCampaigUserId(campaignId);
      logger.info(`Отправка рассылки от пользователя ID с ${userId}`);
      const phoneSenderNumber = await this.getCampaignSenderNumber(campaignId, 'whatsapp');

      if (!phoneSenderNumber) {
        throw new Error(`Недействительный ID кампании или отсутствует номер отправителя для кампании ${campaignId}`);
      }

      logger.info(`Отправка сообщения на ${phoneRecipientNumber} через WhatsApp с ${phoneSenderNumber}`);

      const client = await this.initializeWhatsApp(phoneSenderNumber);

      if (!await this.checkDailyLimit(phoneSenderNumber, 'whatsapp')) {
        logger.warn(`Достигнут дневной лимит WhatsApp для номера телефона: ${phoneSenderNumber}`);
        return { success: false, error: 'Достигнут дневной лимит' };
      }

      const formattedNumber = this.formatPhoneNumber(phoneRecipientNumber);
      logger.info(`Форматированный номер для отправки WhatsApp: ${formattedNumber}`);

      const chat = await client.getChatById(formattedNumber);
      const result = await chat.sendMessage(message);

      const isNewContact = await this.isNewContact(userId, formattedNumber, 'whatsapp');
      await this.updateMessageCount(phoneSenderNumber, isNewContact, 'whatsapp');
      await this.saveDialog(userId, formattedNumber, 'whatsapp', '', message, phoneRecipientNumber);
      logger.info(`Сообщение отправлено на ${phoneRecipientNumber} через WhatsAp  p с ${phoneSenderNumber}`);
      return { success: true, messageId: result.id._serialized };
    } catch (error) {
      logger.error(`Ошибка отправки сообщения WhatsApp для кампании ${campaignId} на ${phoneRecipientNumber}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendTgAndWa(campaignId, phoneRecipientNumber, message) {
    const telegramResult = await this.sendTelegramMessage(campaignId, phoneRecipientNumber, message);
    const whatsappResult = await this.sendWhatsAppMessage(campaignId, phoneRecipientNumber, message);

    if (!telegramResult.success && !whatsappResult.success) {
      return {
        success: false,
        error: telegramResult.error || whatsappResult.error,
      };
    }

    return {
      success: true,
      messageId: telegramResult.messageId || whatsappResult.messageId,
    };
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
      const existingDialog = await dialogRepo.getDialog(userId, contactId, platform);
      return !existingDialog;
    } catch (error) {
      logger.error(`Ошибка при проверке, является ли контакт новым:`, error);
      throw error;
    }
  }

  formatPhoneNumber(phoneNumber) {
    // Удаляем все нецифровые символы
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Добавляем "@c.us" в конец номера
    return `${cleaned}@c.us`;
  }
}

module.exports = new MessageSenderService();
