// src/services/phone/src/PhoneNumberManagerService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, phoneNumberCampaignRepo, campaignsMailingRepo } = require('../../../db');

class PhoneNumberManagerService {
  constructor() {
    this.activePhoneNumbers = new Map();
    this.notificationCallback = null;
  }

  setNotificationCallback(callback) {
    this.notificationCallback = callback;
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

    this.sendNotification(campaign.notificationTelegramIds, message);
  }

  async notifyUserAboutNoAvailablePhoneNumbers(campaignId, platform) {
    const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
    const message = `Внимание! В кампании "${campaign.name}" закончились доступные номера телефонов для платформы ${platform}.\n`
                  + `Пожалуйста, добавьте новые номера или увеличьте лимиты для существующих.`;

    this.sendNotification(campaign.notificationTelegramIds, message);
  }

  sendNotification(telegramIds, message) {
    if (this.notificationCallback) {
      telegramIds.forEach(telegramId => {
        this.notificationCallback(telegramId, message);
      });
    } else {
      logger.warn('Notification callback is not set. Unable to send notifications.');
    }
  }
}

module.exports = new PhoneNumberManagerService();