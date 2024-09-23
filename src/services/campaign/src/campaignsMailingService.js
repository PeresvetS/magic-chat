// src/services/campaign/src/campaignsMailingService.js

const logger = require('../../../utils/logger');
const { getPhoneNumberInfo } = require('../../phone/src/phoneNumberService');
const WABAAccountService = require('../../waba/services/WABAAccountService');
const {
  campaignsMailingRepo,
  phoneNumberCampaignRepo,
} = require('../../../db');

async function createCampaign(telegramId, name) {
  try {
      return await campaignsMailingRepo.createCampaignMailing(telegramId, name);
    } catch (error) {
      logger.error('Error in createCampaignMailing service:', error);
      throw error;
    }
  }

  async function getCampaigUserId(campaignId) {
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

  async function getCampaignSenderNumber(campaignId, platform = 'telegram') {
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

  async function getCampaignById(campaignId) {
    try {
      return await campaignsMailingRepo.getCampaignById(campaignId);
    } catch (error) {
      logger.error('Error in getCampaignById service:', error);
      throw error;
    }
  }

  async function setDefaultPhoneNumber(campaignId, phoneNumber) {
    try {
      const phoneInfo =
        await getPhoneNumberInfo(phoneNumber);
      if (!phoneInfo) {
        throw new Error('Phone number does not exist');
      }
      if (phoneInfo.isBanned) {
        throw new Error('Phone number is banned');
      }
      if (platform === 'waba') {
        const WABAAccount = await WABAAccountService.getAccount(phoneNumber);
        if (!WABAAccount || !WABAAccount.isAuthenticated) {
          throw new Error('Phone number is not WABA authenticated');
        }
      }
      await campaignsMailingRepo.setDefaultPhoneNumber(campaignId, phoneNumber);
    } catch (error) {
      logger.error('Error in setDefaultPhoneNumber service:', error);
      throw error;
    }
  }

  async function getDefaultPhoneNumber(campaignId) {
    try {
      let defaultPhoneNumber =
        await campaignsMailingRepo.getDefaultPhoneNumber(campaignId);
      if (!defaultPhoneNumber) {
        defaultPhoneNumber =
          await campaignsMailingRepo.getFirstAvailablePhoneNumber(campaignId);
        if (defaultPhoneNumber) {
          await this.setDefaultPhoneNumber(campaignId, defaultPhoneNumber);
        }
      }
      return defaultPhoneNumber;
    } catch (error) {
      logger.error('Error in getDefaultPhoneNumber service:', error);
      throw error;
    }
  }

  async function attachPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      const existingAttachment =
        await phoneNumberCampaignRepo.findExistingAttachment(
          phoneNumber,
          campaignId,
        );

      if (existingAttachment) {
        throw new Error('Phone number is already attached to another campaign');
      }

      const phoneNumberRecord =
        await phoneNumberCampaignRepo.getPhoneNumberRecord(phoneNumber);

      if (!phoneNumberRecord) {
        throw new Error('Phone number does not exist');
      }

      if (
        platform === 'telegram' &&
        !phoneNumberRecord.telegramAccount?.isAuthenticated
      ) {
        throw new Error('Phone number is not Telegram authenticated');
      }

      if (
        platform === 'whatsapp' &&
        !phoneNumberRecord.whatsappAccount?.isAuthenticated
      ) {
        throw new Error('Phone number is not WhatsApp authenticated');
      }

      if (platform === 'waba') {
        const WABAAccount = await WABAAccountService.getAccount(phoneNumber);
        if (!WABAAccount || !WABAAccount.isAuthenticated) {
          throw new Error('Phone number is not WABA authenticated');
        }
      }

      logger.info(`Attaching phone number ${phoneNumber} to campaign ${campaignId} on platform ${platform}`);
      return await phoneNumberCampaignRepo.createAttachment(campaignId, phoneNumber, platform);
    } catch (error) {
      logger.error('Error attaching phone number to campaign:', error);
      throw error;
    }
  }

  async function detachPhoneNumber(campaignId, phoneNumber) {
    try {
      logger.info(`Detaching phone number ${phoneNumber} from campaign ${campaignId}`);
      return await phoneNumberCampaignRepo.deleteAttachment(campaignId, phoneNumber);
    } catch (error) {
      logger.error('Error detaching phone number from campaign:', error);
      throw error;
    }
  }

  async function getCampaignByName(name) {
    try {
      return await campaignsMailingRepo.getCampaignByName(name);
    } catch (error) {
      logger.error('Error in getCampaignByName service:', error);
      throw error;
    }
  }

  async function setCampaignMessage(id, message) {
    try {
      return await campaignsMailingRepo.setCampaignMessage(id, message);
    } catch (error) {
      logger.error('Error in setCampaignMessage service:', error);
      throw error;
    }
  }
  async function addNotificationTelegramId(id, telegramId) {
    try {
      return await campaignsMailingRepo.addNotificationTelegramId(
        id,
        telegramId,
      );
    } catch (error) {
      logger.error('Error in addNotificationTelegramId service:', error);
      throw error;
    }
  }

  async function removeNotificationTelegramId(id, telegramId) {
    try {
      return await campaignsMailingRepo.removeNotificationTelegramId(
        id,
        telegramId,
      );
    } catch (error) {
      logger.error('Error in removeNotificationTelegramId service:', error);
      throw error;
    }
  }

  async function getNotificationTelegramIds(id) {
    try {
      return await campaignsMailingRepo.getNotificationTelegramIds(id);
    } catch (error) {
      logger.error('Error in getNotificationTelegramIds service:', error);
      throw error;
    }
  }

  async function toggleCampaignActivity(id, isActive) {
    try {
      return await campaignsMailingRepo.toggleCampaignActivity(id, isActive);
    } catch (error) {
      logger.error('Error in toggleCampaignActivity service:', error);
      throw error;
    }
  }

  async function getActiveCampaignForPhoneNumber(phoneNumber) {
    try {
      return await campaignsMailingRepo.getActiveCampaignForPhoneNumber(
        phoneNumber,
      );
    } catch (error) {
      logger.error('Error in getActiveCampaignForPhoneNumber service:', error);
      throw error;
    }
  }

  async function listCampaigns(userId) {
    try {
      return await campaignsMailingRepo.listCampaignMailings(userId);
    } catch (error) {
      logger.error('Error in listCampaignMailings service:', error);
      throw error;
    }
  }

  async function getActiveCampaign(telegramId) {
    try {
      return await campaignsMailingRepo.getActiveCampaign(telegramId);
    } catch (error) {
      logger.error('Error in getActiveCampaign service:', error);
      throw error;
    }
  }

  async function setPlatformPriority(campaignId, platformPriority) {
    try {
      const validPlatforms = ['telegram', 'whatsapp', 'waba'];
      const isValidPriority = platformPriority
        .split(',')
        .every((platform) => validPlatforms.includes(platform.trim()));
      if (!isValidPriority) {
        throw new Error('Invalid platform priority');
      }
      return await campaignsMailingRepo.setPlatformPriority(
        campaignId,
        platformPriority,
      );
    } catch (error) {
      logger.error('Error in setPlatformPriority service:', error);
      throw error;
    }
  }

  async function getPlatformPriority(campaignId) {
    try {
      return await campaignsMailingRepo.getPlatformPriority(campaignId);
    } catch (error) {
      logger.error('Error in getPlatformPriority service:', error);
      throw error;
    }
  }

  async function attachPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      // Проверяем, существует ли и аутентифицирован ли номер
      const phoneInfo =
        await getPhoneNumberInfo(phoneNumber);
      if (!phoneInfo) {
        throw new Error('Phone number does not exist');
      }
      if (
        platform === 'telegram' &&
        !phoneInfo.telegramAccount?.isAuthenticated
      ) {
        throw new Error('Phone number is not authenticated for Telegram');
      }
      if (
        platform === 'whatsapp' &&
        !phoneInfo.whatsappAccount?.isAuthenticated
      ) {
        throw new Error('Phone number is not authenticated for WhatsApp');
      }

      return await campaignsMailingRepo.attachPhoneNumber(
        campaignId,
        phoneNumber,
        platform,
      );
    } catch (error) {
      logger.error('Error in attachPhoneNumber service:', error);
      throw error;
    }
  }

  async function detachPhoneNumber(campaignId, phoneNumber) {
    try {
      return await campaignsMailingRepo.detachPhoneNumber(
        campaignId,
        phoneNumber,
      );
    } catch (error) {
      logger.error('Error in detachPhoneNumber service:', error);
      throw error;
    }
  }

  async function getCampaignPhoneNumbers(campaignId) {
    try {
      const phoneNumbers = await campaignsMailingRepo.getCampaignPhoneNumbers(campaignId);
    
      return phoneNumbers;
    } catch (error) {
      logger.error('Error in getCampaignPhoneNumbers service:', error);
      throw error;
    }
  }

  async function setDefaultPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      const phoneInfo =
        await getPhoneNumberInfo(phoneNumber);
      if (!phoneInfo) {
        throw new Error('Phone number does not exist');
      }
      if (phoneInfo.isBanned) {
        throw new Error('Phone number is banned');
      }
      await campaignsMailingRepo.setDefaultPhoneNumber(
        campaignId,
        phoneNumber,
        platform,
      );
    } catch (error) {
      logger.error(
        `Error in setDefaultPhoneNumber service for ${platform}:`,
        error,
      );
      throw error;
    }
  }

module.exports = {
  createCampaign,
  getCampaigUserId,
  getCampaignById,
  setDefaultPhoneNumber,
  getDefaultPhoneNumber,
  attachPhoneNumber,
  detachPhoneNumber,
  getCampaignSenderNumber,
  getCampaignByName,
  setCampaignMessage,
  addNotificationTelegramId,
  removeNotificationTelegramId,
  getNotificationTelegramIds,
  toggleCampaignActivity,
  getActiveCampaignForPhoneNumber,
  listCampaigns,
  getActiveCampaign,
  setPlatformPriority,
  getPlatformPriority,
  setDefaultPhoneNumber,
  getCampaignPhoneNumbers,
};
