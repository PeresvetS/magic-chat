// src/services/mailing/services/messageSenderService.js

const logger = require('../../../utils/logger');
const { WABASessionService } = require('../../waba');
const LeadsService = require('../../leads/src/LeadsService');
const { TelegramSessionService } = require('../../telegram');
const { WhatsAppSessionService } = require('../../whatsapp');
const {
  phoneNumberRepo,
  campaignsMailingRepo,
  dialogRepo,
} = require('../../../db');

class MessageSenderService {
  constructor() {
    this.limits = {
      telegram: 40, // определять через БД
      whatsapp: 250,
      waba: 1000,
    };
  }

  async updateOrCreateLeadChatId(campaignId, phoneNumber, chatId, platform) {
    logger.info(
      `Updating ${platform} chat ID for lead: ${phoneNumber}, chatId: ${chatId}`,
    );
    try {
      const formattedPhoneNumber = LeadsService.formatPhoneNumber(phoneNumber);
      await LeadsService.getOrCreatetLeadByPhone(
        formattedPhoneNumber,
        platform,
        chatId,
        campaignId,
      );
    } catch (error) {
      logger.error(`Error updating ${platform} chat ID for lead:`, error);
    }
  }

  async applyDelay(platform) {
    let minDelay;
    let maxDelay;

    if (platform === 'telegram') {
      minDelay = 10000; // 10 seconds
      maxDelay = 60000; // 1 minute
    } else if (platform === 'whatsapp') {
      minDelay = 30000; // 30 seconds
      maxDelay = 300000; // 5 minutes
    } else {
      // Если платформа неизвестна, используем минимальную задержку
      minDelay = 10000;
      maxDelay = 10000;
    }

    const delay = Math.floor(
      Math.random() * (maxDelay - minDelay + 1) + minDelay,
    );
    logger.info(`Applying delay of ${delay}ms for ${platform} platform`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async initializeTelegram(phoneSenderNumber) {
    try {
      const session =
        await TelegramSessionService.createOrGetSession(phoneSenderNumber);
      if (!session.isUserAuthorized()) {
        throw new Error(
          `Telegram client for ${phoneSenderNumber} is not authenticated. Please authenticate first.`,
        );
      }
      return session;
    } catch (error) {
      logger.error(
        `Error initializing Telegram client for ${phoneSenderNumber}:`,
        error,
      );
      throw error;
    }
  }

  async initializeWhatsApp(phoneSenderNumber) {
    try {
      const client =
        await WhatsAppSessionService.createOrGetSession(phoneSenderNumber);
      if (!client.isReady) {
        logger.warn(
          `WhatsApp client for ${phoneSenderNumber} is not ready. Waiting for ready state.`,
        );
        await new Promise((resolve, reject) => {
          const readyTimeout = setTimeout(() => {
            reject(
              new Error(
                `Timeout waiting for WhatsApp client to be ready for ${phoneSenderNumber}`,
              ),
            );
          }, 30000); // 30 секунд таймаут

          client.on('ready', () => {
            clearTimeout(readyTimeout);
            logger.info(
              `WhatsApp client for ${phoneSenderNumber} is now ready.`,
            );
            resolve();
          });
        });
      }
      return client;
    } catch (error) {
      logger.error(
        `Error initializing WhatsApp client for ${phoneSenderNumber}:`,
        error,
      );
      throw error;
    }
  }

  async sendTelegramMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  ) {
    logger.info(
      `Отправка сообщения с ID кампании ${campaignId} от ${senderPhoneNumber} к ${recipientPhoneNumber}`,
    );
    try {
      const userId = await this.getCampaigUserId(campaignId);
      logger.info(`Отправка рассылки от пользователя ID с ${userId}`);

      if (!(await this.checkDailyLimit(senderPhoneNumber, 'telegram'))) {
        logger.warn(
          `Достигнут дневной лимит Telegram для номера телефона: ${senderPhoneNumber}`,
        );
        return { success: false, error: 'DAILY_LIMIT_REACHED' };
      }

      const client = await TelegramSessionService.createOrGetSession(senderPhoneNumber);

      if (!await client.isUserAuthorized()) {
        logger.error(`Клиент Telegram для ${senderPhoneNumber} не авторизован`);
        return { success: false, error: 'CLIENT_NOT_AUTHORIZED' };
      }

      await this.applyDelay('telegram');

      // const recipient = await client.getEntity(recipientPhoneNumber);
      // if (!recipient) {
      //   await LeadsService.setLeadUnavailable(recipientPhoneNumber);
      //   throw new Error(
      //     `Не удалось найти пользователя ${recipientPhoneNumber} в Telegram`,
      //   );
      // }
      const result = await client.sendMessage(recipientPhoneNumber, { message });

      // const peer_id = recipient.id.toString();
      // await this.updateOrCreateLeadChatId(
      //   campaignId,
      //   recipientPhoneNumber,
      //   peer_id,
      //   'telegram',
      // );

      const isNewContact = await this.isNewContact(
        userId,
        recipient.id,
        'telegram',
      );
      await this.updateMessageCount(
        senderPhoneNumber,
        isNewContact,
        'telegram',
      );
      await this.saveDialog(
        userId,
        recipient.id,
        'telegram',
        '',
        message,
        recipientPhoneNumber,
      );
      logger.info(
        `Сообщение отправлено на ${recipientPhoneNumber} через Telegram с ${senderPhoneNumber}`,
      );
      return { success: true, messageId: result.id };
    } catch (error) {
      logger.error(
        `Ошибка отправки сообщения Telegram для кампании ${campaignId} на ${recipientPhoneNumber}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  async sendWABAMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  ) {
    logger.info(
      `Отправка сообщения WABA с ID кампании ${campaignId} от ${senderPhoneNumber} к ${recipientPhoneNumber}`,
    );
    try {
      const userId = await this.getCampaigUserId(campaignId);
      logger.info(`Отправка рассылки от пользователя ID с ${userId}`);

      if (!(await this.checkDailyLimit(senderPhoneNumber, 'waba'))) {
        logger.warn(
          `Достигнут дневной лимит WABA для номера телефона: ${senderPhoneNumber}`,
        );
        return { success: false, error: 'DAILY_LIMIT_REACHED' };
      }

      const client =
        await WABASessionService.createOrGetSession(senderPhoneNumber);

      await this.applyDelay('waba');

      const result = await client.sendMessage(recipientPhoneNumber, message);

      await this.updateOrCreateLeadChatId(
        campaignId,
        recipientPhoneNumber,
        result.id,
        'waba',
      );

      const isNewContact = await this.isNewContact(
        userId,
        recipientPhoneNumber,
        'waba',
      );
      await this.updateMessageCount(senderPhoneNumber, isNewContact, 'waba');
      await this.saveDialog(
        userId,
        recipientPhoneNumber,
        'waba',
        '',
        message,
        recipientPhoneNumber,
      );
      logger.info(
        `Сообщение отправлено на ${recipientPhoneNumber} через WABA с ${senderPhoneNumber}`,
      );
      return { success: true, messageId: result.id };
    } catch (error) {
      logger.error(
        `Ошибка отправки сообщения WABA для кампании ${campaignId} на ${recipientPhoneNumber}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  async getCampaignSenderNumber(campaignId, platform = 'telegram') {
    try {
      const phoneNumbers =
        await campaignsMailingRepo.getCampaignPhoneNumbers(campaignId);
      const phoneSenderNumber = phoneNumbers.find(
        (pn) => pn.platform === platform,
      )?.phoneNumber;

      if (!phoneSenderNumber) {
        throw new Error(
          `No ${platform} sender phone number found for campaign ${campaignId}`,
        );
      }

      return phoneSenderNumber;
    } catch (error) {
      logger.error(
        `Error getting campaign sender number for campaign ${campaignId}:`,
        error,
      );
      throw error;
    }
  }

  async sendWhatsAppMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  ) {
    logger.info(
      `Отправка сообщения с ID кампании ${campaignId} от ${senderPhoneNumber} к ${recipientPhoneNumber}`,
    );
    try {
      const userId = await this.getCampaigUserId(campaignId);
      logger.info(`Отправка рассылки от пользователя ID с ${userId}`);

      if (!(await this.checkDailyLimit(senderPhoneNumber, 'whatsapp'))) {
        logger.warn(
          `Достигнут дневной лимит WhatsApp для номера телефона: ${senderPhoneNumber}`,
        );
        return { success: false, error: 'DAILY_LIMIT_REACHED' };
      }

      const client =
        await WhatsAppSessionService.createOrGetSession(senderPhoneNumber);

      await this.applyDelay('whatsapp');

      const formattedNumber = this.formatPhoneNumber(recipientPhoneNumber);
      logger.info(
        `Форматированный номер для отправки WhatsApp: ${formattedNumber}`,
      );

      const chat = await client.getChatById(formattedNumber);
      if (!chat) {
        await LeadsService.setLeadUnavailable(recipientPhoneNumber);
        throw new Error(`Не удалось найти чат ${formattedNumber} в WhatsApp`);
      }
      const result = await chat.sendMessage(message);

      await this.updateOrCreateLeadChatId(
        campaignId,
        recipientPhoneNumber,
        result.id.remote,
        'whatsapp',
      );

      const isNewContact = await this.isNewContact(
        userId,
        formattedNumber,
        'whatsapp',
      );
      await this.updateMessageCount(
        senderPhoneNumber,
        isNewContact,
        'whatsapp',
      );
      await this.saveDialog(
        userId,
        formattedNumber,
        'whatsapp',
        '',
        message,
        recipientPhoneNumber,
      );
      logger.info(
        `Сообщение отправлено на ${recipientPhoneNumber} через WhatsApp с ${senderPhoneNumber}`,
      );
      return { success: true, messageId: result.id._serialized };
    } catch (error) {
      logger.error(
        `Ошибка отправки сообщения WhatsApp для кампании ${campaignId} на ${recipientPhoneNumber}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  async sendTgAndWa(campaignId, phoneRecipientNumber, message) {
    const telegramResult = await this.sendTelegramMessage(
      campaignId,
      phoneRecipientNumber,
      message,
    );
    const whatsappResult = await this.sendWhatsAppMessage(
      campaignId,
      phoneRecipientNumber,
      message,
    );

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

  async sendTgAndWABA(campaignId, phoneRecipientNumber, message) {
    const telegramResult = await this.sendTelegramMessage(
      campaignId,
      phoneRecipientNumber,
      message,
    );
    const wabaResult = await this.sendWABAMessage(
      campaignId,
      phoneRecipientNumber,
      message,
    );

    if (!telegramResult.success && !wabaResult.success) {
      return {
        success: false,
        error: telegramResult.error || wabaResult.error,
      };
    }

    return {
      success: true,
      messageId: telegramResult.messageId || wabaResult.messageId,
    };
  }

  async checkDailyLimit(phoneNumber, platform) {
    try {
      const phoneNumberInfo =
        await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);

      if (!phoneNumberInfo) {
        return true; // Если записи нет, считаем что лимит не достигнут
      }

      switch (platform) {
        case 'telegram':
          if (!phoneNumberInfo.telegramAccount) {
            throw new Error(
              `No Telegram account found for phone number ${phoneNumber}`,
            );
          }
          return (
            phoneNumberInfo.telegramAccount.contactsReachedToday <
            phoneNumberInfo.telegramAccount.dailyLimit
          );
        case 'whatsapp':
          if (!phoneNumberInfo.whatsappAccount) {
            throw new Error(
              `No WhatsApp account found for phone number ${phoneNumber}`,
            );
          }
          return (
            phoneNumberInfo.whatsappAccount.contactsReachedToday <
            phoneNumberInfo.whatsappAccount.dailyLimit
          );
        case 'waba':
          if (!phoneNumberInfo.WABAAccount) {
            throw new Error(
              `No WABA account found for phone number ${phoneNumber}`,
            );
          }
          return (
            phoneNumberInfo.WABAAccount.contactsReachedToday <
            phoneNumberInfo.WABAAccount.dailyLimit
          );
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
      await phoneNumberRepo.updatePhoneNumberStats(
        phoneSenderNumber,
        isNewContact,
        platform,
      );
    } catch (error) {
      logger.error(
        `Ошибка обновления счетчика сообщений для ${platform}:`,
        error,
      );
      throw error;
    }
  }

  async saveDialog(
    userId,
    contactId,
    platform,
    userRequest,
    assistantResponse,
    phoneRecipientNumber,
  ) {
    try {
      await dialogRepo.saveMessage(
        userId,
        Number(contactId),
        platform,
        userRequest,
        assistantResponse,
        phoneRecipientNumber,
      );
    } catch (error) {
      logger.error('Ошибка сохранения диалога:', error);
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
      logger.error(
        `Error getting campaign user ID for campaign ${campaignId}:`,
        error,
      );
      throw error;
    }
  }

  async isNewContact(userId, contactId, platform) {
    try {
      const existingDialog = await dialogRepo.getDialog(
        userId,
        contactId,
        platform,
      );
      return !existingDialog;
    } catch (error) {
      logger.error('Ошибка при проверке, является ли контакт новым:', error);
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
