// src/services/leads/src/LeadsService.js

const { leadsRepo } = require('../../../db');
const { userRepo } = require('../../../db');
const logger = require('../../../utils/logger');
const CampaignMailingService = require('../../../services/campaign/src/campaignsMailingService');

class LeadsService {

  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Преобразуем входное значение в строку
    let phoneString = String(phone);

    // Удаляем все нецифровые символы
    let cleaned = phoneString.replace(/\D/g, '');

    // Если номер начинается с '8' и длина 11 цифр (российский номер), заменяем '8' на '7'
    if (cleaned.length === 11 && cleaned.startsWith('8')) {
      cleaned = '7' + cleaned.slice(1);
    }

    // Если номер не начинается с '+', добавляем его
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  async getLead(id) {
    try {
      return await leadsRepo.getLead(id);
    } catch (error) {
      logger.error('Error getting lead:', error);
      throw error;
    }
  }

  async createLead(platform, chatId, userId) {
    try {
      const defaultLeadsDB = await this.getOrCreateDefaultLeadsDB(userId);
      
      if (!defaultLeadsDB) {
        throw new Error(`No default LeadsDB found for user ${userId}`);
      }
      
      const lead = await leadsRepo.createLead(platform, chatId, userId, defaultLeadsDB.id);
      return lead;
    } catch (error) {
      logger.error('Error creating lead:', error);
      throw error;
    }
  }

  async getLeadsDBByName(telegramId, name) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      const leadsDBs = await leadsRepo.getLeadsDBs(userId);
      const leadsDB = leadsDBs.find(db => db.name.toLowerCase() === name.toLowerCase());
      if (!leadsDB) {
        throw new Error(`LeadsDB с названием "${name}" не найдена.`);
      }
      return leadsDB;
    } catch (error) {
      logger.error('Error getting LeadsDB by name:', error);
      throw error;
    }
  }

  async attachLeadsDBToCampaignByName(leadsDBName, campaignName, telegramId) {
    try {
      logger.info(`attachLeadsDBToCampaignByName: ${leadsDBName}, ${campaignName}, ${telegramId}`);
      const leadsDB = await this.getLeadsDBByName(telegramId, leadsDBName);
      const campaign = await CampaignMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        throw new Error(`Кампания "${campaignName}" не найдена.`);
      }
      return await leadsRepo.attachLeadsDBToCampaign(leadsDB.id, campaign.id);
    } catch (error) {
      logger.error('Error attaching LeadsDB to campaign by name:', error);
      throw error;
    }
  }

  async detachLeadsDBFromCampaignByName(leadsDBName, campaignName, telegramId) {
    try {
      logger.info(`detachLeadsDBFromCampaignByName: ${leadsDBName}, ${campaignName}, ${telegramId}`);
      const leadsDB = await this.getLeadsDBByName(telegramId, leadsDBName);
      const campaign = await CampaignMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        throw new Error(`Кампания "${campaignName}" не найдена.`);
      }
      return await leadsRepo.detachLeadsDBFromCampaign(leadsDB.id, campaign.id);
    } catch (error) {
      logger.error('Error detaching LeadsDB from campaign by name:', error);
      throw error;
    }
  }

  async getLeadsFromLeadsDBByName(leadsDBName, status, telegramId) {
    try {
      const leadsDB = await this.getLeadsDBByName(telegramId, leadsDBName);
      return await leadsRepo.getLeadsFromLeadsDB(leadsDB.id, status);
    } catch (error) {
      logger.error('Error getting leads from LeadsDB by name:', error);
      throw error;
    }
  }

  async setDefaultLeadsDBByName(telegramId, leadsDBName) {
    try {
      const leadsDB = await this.getLeadsDBByName(telegramId, leadsDBName);
      await leadsRepo.setDefaultLeadsDB(leadsDB.userId, leadsDB.id);
      logger.info(`Default LeadsDB set to "${leadsDBName}" for user ${leadsDB.userId}`);
    } catch (error) {
      logger.error('Error setting default LeadsDB by name:', error);
      throw error;
    }
  }

  async getUserIdByTelegramId(telegramId) {
    try {
      const user = await userRepo.getUserByTgId(telegramId);
      if (!user) {
        throw new Error(`User not found for Telegram ID: ${telegramId}`);
      }
      return user.id;
    } catch (error) {
      logger.error('Error getting user ID by Telegram ID:', error);
      throw error;
    }
  }

  async getLeadsDBs(telegramId) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      return await leadsRepo.getLeadsDBs(userId);
    } catch (error) {
      logger.error('Error getting LeadsDBs:', error);
      throw error;
    }
  }

  async getLeadsDBs(telegramId) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      return await leadsRepo.getLeadsDBs(userId);
    } catch (error) {
      logger.error('Error getting LeadsDBs:', error);
      throw error;
    }
  }

  async getLeadByIdentifier(identifier, platform) {
    try {
      let lead;
      switch (platform) {
        case 'telegram':
          lead = await leadsRepo.getLeadByTelegramChatId(identifier);
          break;
        case 'whatsapp':
        case 'waba':
          lead = await leadsRepo.getLeadByWhatsappChatId(identifier);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      if (!lead) {
        // Если лид не найден по идентификатору чата, попробуем найти по номеру телефона
        const phoneNumber = this.formatPhoneNumber(identifier.split('@')[0]);
        lead = await this.getLeadByPhone(phoneNumber);
      }

      return lead;
    } catch (error) {
      logger.error('Error getting lead by identifier:', error);
      throw error;
    }
  }

  async getLeadByPhone(phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      return await leadsRepo.getLeadByPhone(formattedPhone);
    } catch (error) {
      logger.error('Error getting lead by phone number:', error);
      throw error;
    }
  }

  async updateLeadMessageInfo(leadId, campaignId, platform) {
    try {
      const updatedLead = await leadsRepo.updateLeadMessageInfo(leadId, {
        campaignId,
        lastMessageTime: new Date(),
        lastPlatform: platform
      });
      logger.info(`Message info updated for lead ${leadId} in campaign ${campaignId} on ${platform}`);
      return updatedLead;
    } catch (error) {
      logger.error('Error updating lead message info:', error);
      throw error;
    }
  }

  async getOrCreatetLeadByPhone (phone, platform, chatId, campaignId) {
    try {
      await leadsRepo.getOrCreatetLeadByPhone(phone, platform, chatId, campaignId);
    } catch (error) {
      logger.error('Error getting or creating lead by phone:', error); 
    }
  }

  async addLeadsToLeadsDB(leadsDBId, leads) {
    try {
      const processedLeads = leads.map(lead => ({
        ...lead,
        phone: this.formatPhoneNumber(lead.phone)
      }));

      return await leadsRepo.addLeadsToLeadsDB(leadsDBId, processedLeads);
    } catch (error) {
      logger.error('Error adding leads to LeadsDB:', error);
      throw error;
    }
  }

  async deleteLeadsDB(leadsDBId) {
    try {
      return await leadsRepo.deleteLeadsDB(leadsDBId);
    } catch (error) {
      logger.error('Error deleting LeadsDB:', error);
      throw error;
    }
  }

 
  async attachLeadsDBToCampaign(leadsDBId, campaignId) {
    try {
      const numLeadsDBId = Number(leadsDBId);
      const numCampaignId = Number(campaignId);
      
      if (isNaN(numLeadsDBId) || isNaN(numCampaignId)) {
        throw new Error('Invalid LeadsDB ID or Campaign ID');
      }
      
      return await leadsRepo.attachLeadsDBToCampaign(numLeadsDBId, numCampaignId);
    } catch (error) {
      logger.error('Error attaching LeadsDB to campaign:', error);
      throw error;
    }
  }

  async detachLeadsDBFromCampaign(leadsDBId, campaignId) {
    try {
      return await leadsRepo.detachLeadsDBFromCampaign(leadsDBId, campaignId);
    } catch (error) {
      logger.error('Error detaching LeadsDB from campaign:', error);
      throw error;
    }
  }

  async getLeadsFromLeadsDB(leadsDBId, status) {
    try {
      return await leadsRepo.getLeadsFromLeadsDB(leadsDBId, status);
    } catch (error) {
      logger.error('Error getting leads from LeadsDB:', error);
      throw error;
    }
  }

  async getAttachedLeadsDBs(campaignId) {
    try {
      return await leadsRepo.getAttachedLeadsDBs(campaignId);
    } catch (error) {
      logger.error('Error getting attached LeadsDBs:', error);
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

  async updateLeadStatusByName(telegramId, leadsDBName, leadId, newStatus) {
    try {
      const leadsDB = await this.getLeadsDBByName(telegramId, leadsDBName);
      const lead = await leadsRepo.getLead(leadId);
      if (!lead || lead.leadsDBId !== leadsDB.id) {
        throw new Error(`Лид с ID ${leadId} не найден в базе "${leadsDBName}".`);
      }
      return await leadsRepo.updateLeadStatus(leadId, newStatus);
    } catch (error) {
      logger.error('Error updating lead status by name:', error);
      throw error;
    }
  }

  async updateLeadChatId(leadId, chatId, platform) {
    try {
      let updateData = {};
      switch (platform) {
        case 'telegram':
          updateData = { telegramChatId: chatId };
          break;
        case 'whatsapp':
        case 'waba':
          updateData = { whatsappChatId: chatId };
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      return await leadsRepo.updateLead(leadId, updateData);
    } catch (error) {
      logger.error(`Error updating lead ${platform} chat ID:`, error);
      throw error;
    }
  }

  async getLeadByChatId(chatId, platform) {
    try {
      switch (platform) {
        case 'telegram':
          return await leadsRepo.getLeadByTelegramChatId(chatId);
        case 'whatsapp':
        case 'waba':
          return await leadsRepo.getLeadByWhatsappChatId(chatId);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      logger.error(`Error getting lead by ${platform} chat ID:`, error);
      throw error;
    }
  }

  async deleteLead(leadId) {
    try {
      return await leadsRepo.deleteLead(leadId);
    } catch (error) {
      logger.error('Error deleting lead:', error);
      throw error;
    }
  }

  async deleteLeadByName(telegramId, leadsDBName, leadId) {
    try {
      const leadsDB = await this.getLeadsDBByName(telegramId, leadsDBName);
      const lead = await leadsRepo.getLead(leadId);
      if (!lead || lead.leadsDBId !== leadsDB.id) {
        throw new Error(`Лид с ID ${leadId} не найден в базе "${leadsDBName}".`);
      }
      return await leadsRepo.deleteLead(leadId);
    } catch (error) {
      logger.error('Error deleting lead by name:', error);
      throw error;
    }
  }

  async getLeadsForCampaign(campaignId) {
    try {
      const attachedLeadsDBs = await this.getAttachedLeadsDBs(campaignId);
      let allLeads = [];

      for (const leadsDB of attachedLeadsDBs) {
        const leads = await this.getLeadsFromLeadsDB(leadsDB.id);
        allLeads = allLeads.concat(leads);
      }

      return allLeads;
    } catch (error) {
      logger.error('Error getting leads for campaign:', error);
      throw error;
    }
  }


  async createLeadsDB(name, telegramId) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      return await leadsRepo.createLeadsDB(name, userId);
    } catch (error) {
      logger.error('Error creating LeadsDB:', error);
      throw error;
    }
  }

  async getOrCreateDefaultLeadsDB(userId) {
    try {
      logger.info(`Getting or creating default LeadsDB for user ${userId}`);
      let defaultLeadsDB = await leadsRepo.getDefaultLeadsDB(userId);
      if (!defaultLeadsDB) {
        logger.info(`No default LeadsDB found for user ${userId}. Creating new one.`);
        defaultLeadsDB = await leadsRepo.createLeadsDB('Default LeadsDB', userId, true);
      }
      return defaultLeadsDB;
    } catch (error) {
      logger.error('Error getting or creating default LeadsDB:', error);
      throw error;
    }
  }


  async setDefaultLeadsDB(telegramId, leadsDBId) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      await leadsRepo.setDefaultLeadsDB(userId, leadsDBId);
      logger.info(`Default LeadsDB set for user ${userId}`);
    } catch (error) {
      logger.error('Error setting default LeadsDB:', error);
      throw error;
    }
  }
  async setDefaultLeadsDB(telegramId, leadsDBId) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      await leadsRepo.setDefaultLeadsDB(userId, leadsDBId);
      logger.info(`Default LeadsDB set for user ${userId}`);
    } catch (error) {
      logger.error('Error setting default LeadsDB:', error);
      throw error;
    }
  }

  async addLeadToCRM(telegramId, leadData) {
    try {
      const userId = await this.getUserIdByTelegramId(telegramId);
      const defaultLeadsDB = await this.getOrCreateDefaultLeadsDB(userId);
      const lead = await leadsRepo.saveLead({
        ...leadData,
        leadsDBId: defaultLeadsDB.id,
        userId
      });
      logger.info(`Lead added to default LeadsDB for user ${userId}`);
      return lead;
    } catch (error) {
      logger.error('Error adding lead to CRM:', error);
      throw error;
    }
  }

  async updateLeadTelegramChatId(leadId, telegramChatId) {
    try {
      return await leadsRepo.updateLead(leadId, { telegramChatId });
    } catch (error) {
      logger.error('Error updating lead Telegram chat ID:', error);
      throw error;
    }
  }

  async updateLeadWhatsappChatId(leadId, whatsappChatId) {
    try {
      return await leadsRepo.updateLead(leadId, { whatsappChatId });
    } catch (error) {
      logger.error('Error updating lead WhatsApp chat ID:', error);
      throw error;
    }
  }

  async getLeadByTelegramChatId(telegramChatId) {
    try {
      return await leadsRepo.getLeadByTelegramChatId(telegramChatId);
    } catch (error) {
      logger.error('Error getting lead by Telegram chat ID:', error);
      throw error;
    }
  }

  async getLeadByWhatsappChatId(whatsappChatId) {
    try {
      return await leadsRepo.getLeadByWhatsappChatId(whatsappChatId);
    } catch (error) {
      logger.error('Error getting lead by WhatsApp chat ID:', error);
      throw error;
    }
  }

  async setLeadUnavailable(phoneNumber) {
    try {
      const lead = await this.getLeadByPhone(phoneNumber);
      if (lead) {
        await this.updateLeadStatus(lead.id, 'UNAVAILABLE');
        logger.info(`Lead with phone ${phoneNumber} set to UNAVAILABLE`);
      }
    } catch (error) {
      logger.error(`Error setting lead to UNAVAILABLE:`, error);
    }
  }
}

module.exports = new LeadsService();

