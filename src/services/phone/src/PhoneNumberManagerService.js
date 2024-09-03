// src/services/phone/src/PhoneNumberManagerService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, phoneNumberCampaignRepo } = require('../../../db');
const telegramBot = require('../../telegram/telegramBot');

class PhoneNumberManagerService {
  constructor() {
    this.activePhoneNumbers = new Map();
  }

  async getNextAvailablePhoneNumber(campaignId, platform) {
    const phoneNumbers = await this.getCampaignPhoneNumbers(campaignId, platform);
    
    for (const phoneNumber of phoneNumbers) {
      if (await this.isPhoneNumberAvailable(phoneNumber, platform)) {
        return phoneNumber;
      }
    }

    return null;
  }

  async isPhoneNumberAvailable(phoneNumber, platform) {
    const phoneInfo = await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);
    
    if (!phoneInfo) return false;
    if (phoneInfo.isBanned) return false;

    const account = platform === 'telegram' ? phoneInfo.telegramAccount : phoneInfo.whatsappAccount;
    
    if (!account || !account.isAuthenticated) return false;
    if (account.contactsReachedToday >= account.dailyLimit) return false;

    return true;
  }

  async getCampaignPhoneNumbers(campaignId, platform) {
    const attachments = await phoneNumberCampaignRepo.findAttachmentsByCampaignAndPlatform(campaignId, platform);
    return attachments.map(attachment => attachment.phoneNumber);
  }

  async switchToNextPhoneNumber(campaignId, currentPhoneNumber, platform) {
    const nextPhoneNumber = await this.getNextAvailablePhoneNumber(campaignId, platform);
    
    if (nextPhoneNumber) {
      await this.notifyUserAboutPhoneNumberSwitch(campaignId, currentPhoneNumber, nextPhoneNumber, platform);
      return nextPhoneNumber;
    } else {
      await this.notifyUserAboutNoAvailablePhoneNumbers(campaignId, platform);
      return null;
    }
  }

  async notifyUserAboutPhoneNumberSwitch(campaignId, oldPhoneNumber, newPhoneNumber, platform) {
    const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
    const message = `Внимание! В кампании "${campaign.name}" произошла смена номера телефона для платформы ${platform}.\n`
                  + `Старый номер: ${oldPhoneNumber}\n`
                  + `Новый номер: ${newPhoneNumber}\n`
                  + `Причина: достижение лимита отправки или недоступность номера.`;

    for (const telegramId of campaign.notificationTelegramIds) {
      await telegramBot.sendMessage(telegramId, message);
    }
  }

  async notifyUserAboutNoAvailablePhoneNumbers(campaignId, platform) {
    const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
    const message = `Внимание! В кампании "${campaign.name}" закончились доступные номера телефонов для платформы ${platform}.\n`
                  + `Пожалуйста, добавьте новые номера или увеличьте лимиты для существующих.`;

    for (const telegramId of campaign.notificationTelegramIds) {
      await telegramBot.sendMessage(telegramId, message);
    }
  }
}

module.exports = new PhoneNumberManagerService();