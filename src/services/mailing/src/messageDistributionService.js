// src/services/mailing/src/messageDistributionService.js

const messageSenderService = require('./messageSenderService');
const MessagingPlatformChecker = require('./MessagingPlatformChecker');
const logger = require('../../../utils/logger');
const { campaignsMailingService } = require('../../campaign');

class MessageDistributionService {

  constructor() {
    this.lastMessageTimes = new Map();
    this.RATE_LIMIT_SECONDS = 60; // 1 минута
  } 

  async distributeMessage(campaignId, message, phoneNumber, platformPriority = 'telegram', mode = 'one') {
    logger.info(`Distributing message to ${phoneNumber} with priority ${platformPriority} and mode ${mode}`);
    const strPhoneNumber = String(phoneNumber);
    try {
      const attachedPhones = await campaignsMailingService.getCampaignPhoneNumbers(campaignId);
      if (attachedPhones.length === 0) {
        throw new Error(`Campaign ${campaignId} has no attached phone numbers`);
      }

      if (!message) {
        throw new Error(`Campaign ${campaignId} has no message for distribution`);
      }

      const platforms = await MessagingPlatformChecker.choosePlatform(campaignId, strPhoneNumber, platformPriority, mode);
      logger.info(`Distributing message to ${strPhoneNumber} with platforms ${platforms}`);
      let results = {
        strPhoneNumber,
        telegram: null,
        whatsapp: null,
        tgwa: null,
      };
      switch (platforms) {
        case 'telegram':
          results.telegram = await messageSenderService.sendTelegramMessage(campaignId, strPhoneNumber, message);
          break;
        case 'whatsapp':
          results.whatsapp = await messageSenderService.sendWhatsAppMessage(campaignId, strPhoneNumber, message);
          break;
        case 'tgwa':
          results.tgwa = await messageSenderService.sendTgAndWa(strPhoneNumber, message);
          break;
        default:
          logger.warn(`No messaging platforms available for ${strPhoneNumber}`);
          break;
      }

      return results;
    } catch (error) {
      logger.error(`Error distributing message to ${strPhoneNumber}:`, error);
      throw error;
    }
  }

  async bulkDistribute(campaignId, contacts, message, priorityPlatform = null, mode = 'both') {
    logger.info(`Starting bulk distribution for campaign ${campaignId}`);
    const results = {
      totalContacts: contacts.length,
      successfulSends: 0,
      failedSends: 0,
      details: []
    };

    const campaign = await campaignsMailingService.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    if (!campaign.message && !message) {
      throw new Error(`Campaign ${campaignId} has no message for distribution`);
    }
    const distributionMessage = message || campaign.message;
    const distributionPriority = priorityPlatform || campaign.platformPriority;

    for (const contact of contacts) {
      try {
        const result = await this.distributeMessage(
          campaignId,
          distributionMessage,
          contact.phoneNumber,
          distributionPriority,
          mode
        );

        if ((result.telegram && result.telegram.success) ||
            (result.whatsapp && result.whatsapp.success) ||
            (result.tgwa && result.tgwa.success)) {
          results.successfulSends++;
          results.details.push({
            phoneNumber: contact.phoneNumber,
            status: 'success',
            platform: this.getSuccessfulPlatform(result)
          });
        } else {
          results.failedSends++;
          results.details.push({
            phoneNumber: contact.phoneNumber,
            status: 'failed',
            error: this.getErrorMessage(result)
          });
        }

        // Добавляем небольшую задержку между отправками
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error in bulk distribution for ${contact.phoneNumber}:`, error);
        results.failedSends++;
        results.details.push({
          phoneNumber: contact.phoneNumber,
          status: 'failed',
          error: error.message
        });
      }
    }

    logger.info(`Bulk distribution completed for campaign ${campaignId}. Results:`, results);
    return results;
  }

  getSuccessfulPlatform(result) {
    if (result.telegram && result.telegram.success) return 'telegram';
    if (result.whatsapp && result.whatsapp.success) return 'whatsapp';
    if (result.tgwa && result.tgwa.success) return 'telegram and whatsapp';
    return 'unknown';
  }

  getErrorMessage(result) {
    return result.telegram?.error || result.whatsapp?.error || result.tgwa?.error || 'Unknown error';
  }


  async sendMessageToLead(lead, user) {
    const cacheKey = `${lead.phone}_${user.id}`;
    const now = Date.now();
    const lastSentTime = this.lastMessageTimes.get(cacheKey);

    if (lastSentTime && (now - lastSentTime) < this.RATE_LIMIT_SECONDS * 1000) {
      logger.info(`Сообщение для номера ${lead.phone} уже было отправлено недавно. Пропускаем отправку.`);
      return;
    }

    const activeCampaign = await campaignsMailingService.getActiveCampaign(user.telegramId);
    if (activeCampaign && activeCampaign.message) {
      try {
        logger.info(`Отправляем автоматическое сообщение для лида ${lead.phone} в кампанию ${activeCampaign.id} с приоритетом ${activeCampaign.platformPriority} сообщение ${activeCampaign.message}`);
        const result = await this.distributeMessage(activeCampaign.id, activeCampaign.message, lead.phone, activeCampaign.platformPriority, 'one');
        
        if (result.telegram && result.telegram.success) {
          logger.info(`Автоматическое сообщение отправлено в Telegram для лида ${lead.id}`);
          this.lastMessageTimes.set(cacheKey, now);
        } 
        else if (result.whatsapp && result.whatsapp.success) {
          logger.info(`Автоматическое сообщение отправлено в WhatsApp для лида ${lead.id}`);
          this.lastMessageTimes.set(cacheKey, now);
        } 
        else if (result.tgwa && result.tgwa.success) {
          logger.info(`Автоматическое сообщение отправлено в Telegram и/или WhatsApp для лида ${lead.id}`);
          this.lastMessageTimes.set(cacheKey, now);
        }
        else {
          logger.warn(`Не удалось отправить автоматическое сообщение для лида ${lead.id}`);
        }
      } catch (error) {
        logger.error('Ошибка при отправке автоматического сообщения:', error);
      }
    } else {
      logger.info('Нет активной кампании или сообщения для автоматической отправки');
    }
  }

  clearOldEntries() {
    const now = Date.now();
    for (const [key, time] of this.lastMessageTimes.entries()) {
      if (now - time > this.RATE_LIMIT_SECONDS * 1000) {
        this.lastMessageTimes.delete(key);
      }
    }
  }
}

module.exports = new MessageDistributionService();