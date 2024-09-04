// src/services/campaign/src/campaignsMailingService.js

const logger = require('../../../utils/logger');
const { phoneNumberService } = require('../../phone');
const WABAAccountService = require('../../waba/services/WABAAccountService');
const { campaignsMailingRepo, phoneNumberCampaignRepo } = require('../../../db');

class CampaignMailingService {
  async createCampaign(telegramId, name) {
    try {
      return await campaignsMailingRepo.createCampaignMailing(telegramId, name);
    } catch (error) {
      logger.error('Error in createCampaignMailing service:', error);
      throw error;
    }
  }

  async getCampaignById(campaignId) {
    try {
      return await campaignsMailingRepo.getCampaignById(campaignId);
    } catch (error) {
      logger.error('Error in getCampaignById service:', error);
      throw error;
    }
  }

  async setDefaultPhoneNumber(campaignId, phoneNumber) {
    try {
      const phoneInfo = await phoneNumberService.getPhoneNumberInfo(phoneNumber);
      if (!phoneInfo) {
        throw new Error('Phone number does not exist');
      }
      if (phoneInfo.isBanned) {
        throw new Error('Phone number is banned');
      }
      if (platform === 'waba') {
        const wabaAccount = await WABAAccountService.getAccount(phoneNumber);
        if (!wabaAccount || !wabaAccount.isAuthenticated) {
          throw new Error('Phone number is not WABA authenticated');
        }
      }
      await campaignsMailingRepo.setDefaultPhoneNumber(campaignId, phoneNumber);
    } catch (error) {
      logger.error('Error in setDefaultPhoneNumber service:', error);
      throw error;
    }
  }

  async getDefaultPhoneNumber(campaignId) {
    try {
      let defaultPhoneNumber = await campaignsMailingRepo.getDefaultPhoneNumber(campaignId);
      if (!defaultPhoneNumber) {
        defaultPhoneNumber = await campaignsMailingRepo.getFirstAvailablePhoneNumber(campaignId);
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

  async attachPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      const existingAttachment = await phoneNumberCampaignRepo.findExistingAttachment(phoneNumber, campaignId);

      if (existingAttachment) {
        throw new Error('Phone number is already attached to another campaign');
      }

      const phoneNumberRecord = await phoneNumberCampaignRepo.getPhoneNumberRecord(phoneNumber);

      if (!phoneNumberRecord) {
        throw new Error('Phone number does not exist');
      }

      if (platform === 'telegram' && !phoneNumberRecord.telegramAccount?.isAuthenticated) {
        throw new Error('Phone number is not Telegram authenticated');
      }

      if (platform === 'whatsapp' && !phoneNumberRecord.whatsappAccount?.isAuthenticated) {
        throw new Error('Phone number is not WhatsApp authenticated');
      }

      if (platform === 'waba') {
        const wabaAccount = await WABAAccountService.getAccount(phoneNumber);
        if (!wabaAccount || !wabaAccount.isAuthenticated) {
          throw new Error('Phone number is not WABA authenticated');
        }
      }

      return await phoneNumberCampaignRepo.createAttachment(campaignId, phoneNumber, platform);
    } catch (error) {
      logger.error('Error attaching phone number to campaign:', error);
      throw error;
    }
  }

  async detachPhoneNumber(campaignId, phoneNumber) {
    try {
      return await phoneNumberCampaignRepo.deleteAttachment(campaignId, phoneNumber);
    } catch (error) {
      logger.error('Error detaching phone number from campaign:', error);
      throw error;
    }
  }

  async getCampaignByName(name) {
    try {
      return await campaignsMailingRepo.getCampaignByName(name);
    } catch (error) {
      logger.error('Error in getCampaignByName service:', error);
      throw error;
    }
  }

  async setCampaignMessage(id, message) {
    try {
      return await campaignsMailingRepo.setCampaignMessage(id, message);
    } catch (error) {
      logger.error('Error in setCampaignMessage service:', error);
      throw error;
    }
  }

  async setGoogleSheetUrl(id, googleSheetUrl) {
    try {
      return await campaignsMailingRepo.setGoogleSheetUrl(id, googleSheetUrl);
    } catch (error) {
      logger.error('Error in setGoogleSheetUrl service:', error);
      throw error;
    }
  }

  async addNotificationTelegramId(id, telegramId) {
    try {
      return await campaignsMailingRepo.addNotificationTelegramId(id, telegramId);
    } catch (error) {
      logger.error('Error in addNotificationTelegramId service:', error);
      throw error;
    }
  }

  async removeNotificationTelegramId(id, telegramId) {
    try {
      return await campaignsMailingRepo.removeNotificationTelegramId(id, telegramId);
    } catch (error) {
      logger.error('Error in removeNotificationTelegramId service:', error);
      throw error;
    }
  }

  async getNotificationTelegramIds(id) {
    try {
      return await campaignsMailingRepo.getNotificationTelegramIds(id);
    } catch (error) {
      logger.error('Error in getNotificationTelegramIds service:', error);
      throw error;
    }
  }

  async toggleCampaignActivity(id, isActive) {
    try {
      return await campaignsMailingRepo.toggleCampaignActivity(id, isActive);
    } catch (error) {
      logger.error('Error in toggleCampaignActivity service:', error);
      throw error;
    }
  }

  async getActiveCampaignForPhoneNumber(phoneNumber) {
    try {
      return await campaignsMailingRepo.getActiveCampaignForPhoneNumber(phoneNumber);
    } catch (error) {
      logger.error('Error in getActiveCampaignForPhoneNumber service:', error);
      throw error;
    }
  }

  async listCampaigns(userId) {
    try {
      return await campaignsMailingRepo.listCampaignMailings(userId);
    } catch (error) {
      logger.error('Error in listCampaignMailings service:', error);
      throw error;
    }
  }

  async getActiveCampaign(telegramId) {
    try {
      return await campaignsMailingRepo.getActiveCampaign(telegramId);
    } catch (error) {
      logger.error('Error in getActiveCampaign service:', error);
      throw error;
    }
  }

  async setPlatformPriority(campaignId, platformPriority) {
    try {
      const validPlatforms = ['telegram', 'whatsapp', 'waba'];
      const isValidPriority = platformPriority.split(',').every(platform => validPlatforms.includes(platform.trim()));
      if (!isValidPriority) {
        throw new Error('Invalid platform priority');
      }
      return await campaignsMailingRepo.setPlatformPriority(campaignId, platformPriority);
    } catch (error) {
      logger.error('Error in setPlatformPriority service:', error);
      throw error;
    }
  }

  async getPlatformPriority(campaignId) {
    try {
      return await campaignsMailingRepo.getPlatformPriority(campaignId);
    } catch (error) {
      logger.error('Error in getPlatformPriority service:', error);
      throw error;
    }
  }

  async attachPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      // Проверяем, существует ли и аутентифицирован ли номер
      const phoneInfo = await phoneNumberService.getPhoneNumberInfo(phoneNumber);
      if (!phoneInfo) {
        throw new Error('Phone number does not exist');
      }
      if (platform === 'telegram' && !phoneInfo.telegramAccount?.isAuthenticated) {
        throw new Error('Phone number is not authenticated for Telegram');
      }
      if (platform === 'whatsapp' && !phoneInfo.whatsappAccount?.isAuthenticated) {
        throw new Error('Phone number is not authenticated for WhatsApp');
      }

      return await campaignsMailingRepo.attachPhoneNumber(campaignId, phoneNumber, platform);
    } catch (error) {
      logger.error('Error in attachPhoneNumber service:', error);
      throw error;
    }
  }

  async detachPhoneNumber(campaignId, phoneNumber) {
    try {
      return await campaignsMailingRepo.detachPhoneNumber(campaignId, phoneNumber);
    } catch (error) {
      logger.error('Error in detachPhoneNumber service:', error);
      throw error;
    }
  }

  async getCampaignPhoneNumbers(campaignId) {
    try {
      return await campaignsMailingRepo.getCampaignPhoneNumbers(campaignId);
    } catch (error) {
      logger.error('Error in getCampaignPhoneNumbers service:', error);
      throw error;
    }
  }

  async setCampaignPrompt(id, promptId) {
    try {
      return await campaignsMailingRepo.setCampaignPrompt(id, promptId);
    } catch (error) {
      logger.error('Error in setCampaignPrompt service:', error);
      throw error;
    }
  }

  async setDefaultPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      const phoneInfo = await phoneNumberService.getPhoneNumberInfo(phoneNumber);
      if (!phoneInfo) {
        throw new Error('Phone number does not exist');
      }
      if (phoneInfo.isBanned) {
        throw new Error('Phone number is banned');
      }
      await campaignsMailingRepo.setDefaultPhoneNumber(campaignId, phoneNumber, platform);
    } catch (error) {
      logger.error(`Error in setDefaultPhoneNumber service for ${platform}:`, error);
      throw error;
    }
  }
}

module.exports = new CampaignMailingService();