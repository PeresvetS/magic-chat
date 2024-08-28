// src/services/campaign/src/campaignsMailingService.js

const { campaignsMailingRepo } = require('../../../db');
const { phoneNumberService } = require('../../phone');
const logger = require('../../../utils/logger');

class CampaignMailingService {
  async createCampaign(telegramId, name) {
    try {
      return await campaignsMailingRepo.createCampaignMailing(telegramId, name);
    } catch (error) {
      logger.error('Error in createCampaignMailing service:', error);
      throw error;
    }
  }

  async getCampaignByName(name) {
    try {
      return await campaignsMailingRepo.getCampaignMailingByName(name);
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

  async toggleCampaignActivity(id, isActive) {
    try {
      return await campaignsMailingRepo.toggleCampaignActivity(id, isActive);
    } catch (error) {
      logger.error('Error in toggleCampaignActivity service:', error);
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
      return await campaignsMailingRepo.setPlatformPriority(campaignId, platformPriority);
    } catch (error) {
      logger.error('Error in setPlatformPriority service:', error);
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
}

module.exports = new CampaignMailingService();