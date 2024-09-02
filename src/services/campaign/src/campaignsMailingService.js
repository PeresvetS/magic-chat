// src/services/campaign/src/campaignsMailingService.js

const logger = require('../../../utils/logger');
const { phoneNumberService } = require('../../phone');
const { campaignsMailingRepo, phoneNumberCampaignRepo, leadsRepo } = require('../../../db');

class CampaignMailingService {
  async createCampaign(telegramId, name) {
    try {
      return await campaignsMailingRepo.createCampaignMailing(telegramId, name);
    } catch (error) {
      logger.error('Error in createCampaignMailing service:', error);
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
      return await leadsRepo.getCampaignByName(name);
    } catch (error) {
      logger.error(`Ошибка при получении кампании по имени ${name}:`, error);
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

  async addLeadsToCampaign(campaignId, leads) {
    try {
      logger.info(`Добавление ${leads.length} лидов в кампанию ${campaignId}`);
      const addedLeadsCount = await leadsRepo.addLeadsToCampaign(campaignId, leads);
      logger.info(`Успешно добавлено ${addedLeadsCount} лидов в кампанию ${campaignId}`);
      return addedLeadsCount;
    } catch (error) {
      logger.error(`Ошибка при добавлении лидов в кампанию ${campaignId}:`, error);
      throw error;
    }
  }

  async getLeadsForCampaign(campaignId, status = 'NEW') {
    try {
      return await leadsRepo.getLeadsForCampaign(campaignId, status);
    } catch (error) {
      logger.error('Error getting leads for campaign:', error);
      throw error;
    }
  }

  async updateLeadStatus(leadId, newStatus) {
    try {
      return await leadsRepo.updateLeadStatus(leadId, newStatus);
    } catch (error) {
      logger.error('Error updating lead status:', error);
      throw error;
    }
  }
}

module.exports = new CampaignMailingService();