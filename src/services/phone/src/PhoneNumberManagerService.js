// src/services/phone/src/PhoneNumberManagerService.js

const logger = require('../../../utils/logger');
const WABAAccountService = require('../../waba/services/WABAAccountService');
const {
  phoneNumberRepo,
  phoneNumberCampaignRepo,
  campaignsMailingRepo,
  phoneNumberRotationRepo, // Добавьте этот импорт
} = require('../../../db');

class PhoneNumberManagerService {
  constructor(
    phoneNumberRepo,
    phoneNumberCampaignRepo,
    campaignsMailingRepo,
    phoneNumberRotationRepo,
    wabaAccountService
  ) {
    this.phoneNumberRepo = phoneNumberRepo;
    this.phoneNumberCampaignRepo = phoneNumberCampaignRepo;
    this.campaignsMailingRepo = campaignsMailingRepo;
    this.phoneNumberRotationRepo = phoneNumberRotationRepo;
    this.wabaAccountService = wabaAccountService;
    this.activePhoneNumbers = new Map();
    this.notificationCallback = null;
  }

  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  async getNextAvailablePhoneNumber(campaignId, platform) {
    const phoneNumbers = await this.getCampaignPhoneNumbers(
      campaignId,
      platform,
    );

    if (phoneNumbers.length === 0) {
      logger.error(`No phone numbers available for platform ${platform} in campaign ${campaignId}`);
      return null;
    }

    const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
    let rotationState = await phoneNumberRotationRepo.getRotationState(campaign.userId, campaignId, platform);
    let currentIndex = rotationState ? rotationState.currentIndex : 0;
    logger.info(`Starting rotation for campaign ${campaignId}, platform ${platform} from index ${currentIndex}`);

    let attempts = 0;
    while (attempts < phoneNumbers.length) {
      const phoneNumber = phoneNumbers[currentIndex];
      currentIndex = (currentIndex + 1) % phoneNumbers.length;

      logger.debug(`Checking phone number ${phoneNumber} for availability`);
      if (await this.isPhoneNumberAvailable(phoneNumber, platform)) {
        await phoneNumberRotationRepo.updateRotationState(campaign.userId, campaignId, platform, currentIndex);
        logger.info(`Selected phone number ${phoneNumber} for campaign ${campaignId}, platform ${platform}`);
        return phoneNumber;
      }

      attempts++;
    }

    logger.error(`No available phone numbers for platform ${platform} in campaign ${campaignId} after ${attempts} attempts`);
    return null;
  }

  async isPhoneNumberAvailable(phoneNumber, platform) {
    const phoneInfo = await this.phoneNumberRepo.getPhoneNumberInfo(phoneNumber);

    if (!phoneInfo) {
      return false;
    }
    if (phoneInfo.isBanned) {
      return false;
    }

    let account;
    switch (platform) {
      case 'telegram':
        account = phoneInfo.telegramAccount;
        break;
      case 'whatsapp':
        account = phoneInfo.whatsappAccount;
        break;
      case 'waba':
        account = await this.wabaAccountService.getAccount(phoneNumber);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (!account || !account.isAuthenticated) {
      return false;
    }
    if (account.contactsReachedToday >= account.dailyLimit) {
      return false;
    }

    return true;
  }

  async getCampaignPhoneNumbers(campaignId, platform) {
    const attachments =
      await this.phoneNumberCampaignRepo.findAttachmentsByCampaignAndPlatform(
        campaignId,
        platform,
      );
    return attachments.map((attachment) => attachment.phoneNumber);
  }

  async switchToNextPhoneNumber(campaignId, currentPhoneNumber, platform) {
    const nextPhoneNumber = await this.getNextAvailablePhoneNumber(
      campaignId,
      platform,
    );

    if (nextPhoneNumber) {
      await this.notifyUserAboutPhoneNumberSwitch(
        campaignId,
        currentPhoneNumber,
        nextPhoneNumber,
        platform,
      );
      return nextPhoneNumber;
    }
    await this.notifyUserAboutNoAvailablePhoneNumbers(campaignId, platform);
    return null;
  }

  async notifyUserAboutPhoneNumberSwitch(
    campaignId,
    oldPhoneNumber,
    newPhoneNumber,
    platform,
  ) {
    const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
    const message =
      `Внимание! В кампании "${campaign.name}" произошла смена номера телефона для платформы ${platform}.\n` +
      `Старый номер: ${oldPhoneNumber}\n` +
      `Новый номер: ${newPhoneNumber}\n` +
      'Причина: достижение лимита отправки или недоступность номера.';

    this.sendNotification(campaign.notificationTelegramIds, message);
  }

  async notifyUserAboutNoAvailablePhoneNumbers(campaignId, platform) {
    const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
    const message =
      `Внимание! В кампании "${campaign.name}" закончились доступные номера телефонов для платформы ${platform}.\n` +
      'Пожалуйста, добавьте новые номера или увеличьте лимиты для существующих.';

    this.sendNotification(campaign.notificationTelegramIds, message);
  }

  sendNotification(telegramIds, message) {
    if (this.notificationCallback) {
      telegramIds.forEach((telegramId) => {
        this.notificationCallback(telegramId, message);
      });
    } else {
      logger.warn(
        'Notification callback is not set. Unable to send notifications.',
      );
    }
  }
}

module.exports = PhoneNumberManagerService;
