// src/services/maiiling/src/messageDistributionService.js

const messageSenderService = require('./messageSenderService');
const MessagingPlatformChecker = require('./MessagingPlatformChecker');
const logger = require('../../../utils/logger');
const { campaignsMailingService } = require('../../campaign');

class MessageDistributionService {
  async distributeMessage(campaignId, message, phoneNumber, priorityPlatform = null) {
    const strPhoneNumber = String(phoneNumber);
    try {
      const platforms = await MessagingPlatformChecker.choosePlatform(campaignId, strPhoneNumber, priorityPlatform);

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
          results.whatsapp = await messageSenderService.sendWhatsAppMessage(strPhoneNumber, message);
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

  async bulkDistribute(campaignId, contacts, message, priorityPlatform = null) {
    const results = [];
    for (const contact of contacts) {
      try {
        const result = await this.distributeMessage(campaignId, message, contact.phoneNumber, priorityPlatform);
        results.push(result);
      } catch (error) {
        logger.error(`Error in bulk distribution for ${contact.phoneNumber}:`, error);
        results.push({
          phoneNumber: contact.phoneNumber,
          error: error.message
        });
      }
    }
    return results;
  }

  async sendMessageToLead(lead) {
    
  // Проверяем наличие активной кампании и отправляем сообщение, если она есть
    const activeCampaign = await campaignsMailingService.getActiveCampaign(telegramId);
    if (activeCampaign && activeCampaign.message) {
      try {
        const result = await this.distributeMessage(activeCampaign.id, activeCampaign.message, lead.phone, activeCampaign.priorityPlatform);
        if (result.telegram && result.telegram.success) {
          logger.info(`Автоматическое сообщение отправлено в Telegram для лида ${lead.id}`);
        } 
        else if (result.whatsapp && result.whatsapp.success) {
          logger.info(`Автоматическое сообщение отправлено в WhatsApp для лида ${lead.id}`);
        } 
        else if (result.tgwa && result.tgwa.success) {
          logger.info(`Автоматическое сообщение отправлено в Telegram и WhatsApp для лида ${lead.id}`);
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

}

module.exports = new MessageDistributionService();