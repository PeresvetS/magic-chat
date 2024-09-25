// src/services/leads/src/leadService.js

const { leadsRepo } = require('../../../db');
const logger = require('../../../utils/logger');
const { getUserIdByTelegramId } = require('../../user/src/userService');

const { campaignsMailingService } = require('../../campaign');
const { formatPhoneNumber } = require('../../../utils/phoneHelpers');

async function getLead(id) {
  try {
    return await leadsRepo.getLead(id);
  } catch (error) {
    logger.error('Error getting lead:', error);
    throw error;
  }
}

async function updateOrCreateLeadChatId(campaignId, phoneNumber, chatId, platform) {
  logger.info(
    `Updating ${platform} chat ID for lead: ${phoneNumber}, chatId: ${chatId}`,
  );
  try {
    const formattedPhoneNumber = getUserIdByTelegramId(phoneNumber);
    await leadService.getOrCreatetLeadByPhone(
      formattedPhoneNumber,
      platform,
      chatId,
      campaignId,
    );
  } catch (error) {
    logger.error(`Error updating ${platform} chat ID for lead:`, error);
  }
}

async function getLeadsDBByName(telegramId, name) {
  try {
    const userId = await getUserIdByTelegramId(telegramId);
    const leadsDBs = await leadsRepo.getLeadsDBs(userId);
    const leadsDB = leadsDBs.find(
      (db) => db.name.toLowerCase() === name.toLowerCase(),
    );
    if (!leadsDB) {
      throw new Error(`LeadsDB с названием "${name}" не найдена.`);
    }
    return leadsDB;
  } catch (error) {
    logger.error('Error getting LeadsDB by name:', error);
    throw error;
  }
}

async function createLead(platform, chatId, userId) {
  try {
    const defaultLeadsDB = await getOrCreateDefaultLeadsDB(userId);

    if (!defaultLeadsDB) {
      throw new Error(`No default LeadsDB found for user ${userId}`);
    }

    const lead = await leadsRepo.createLead(
      platform,
      chatId,
      userId,
      defaultLeadsDB.id,
    );
    return lead;
  } catch (error) {
    logger.error('Error creating lead:', error);
    throw error;
  }
}

async function attachLeadsDBToCampaignByName(leadsDBName, campaignName, telegramId) {
  try {
    logger.info(
      `attachLeadsDBToCampaignByName: ${leadsDBName}, ${campaignName}, ${telegramId}`,
    );
    const leadsDB = await getLeadsDBByName(telegramId, leadsDBName);
    const campaign = await campaignsMailingService.getCampaignByName(campaignName);
    if (!campaign) {
      throw new Error(`Кампания "${campaignName}" не найдена.`);
    }
    return await leadsRepo.attachLeadsDBToCampaign(leadsDB.id, campaign.id);
  } catch (error) {
    logger.error('Error attaching LeadsDB to campaign by name:', error);
    throw error;
  }
}

async function detachLeadsDBFromCampaignByName(leadsDBName, campaignName, telegramId) {
  try {
    logger.info(
      `detachLeadsDBFromCampaignByName: ${leadsDBName}, ${campaignName}, ${telegramId}`,
    );
    const leadsDB = await getLeadsDBByName(telegramId, leadsDBName);
    const campaign =
      await campaignsMailingService.getCampaignByName(campaignName);
    if (!campaign) {
      throw new Error(`Кампания "${campaignName}" не найдена.`);
    }
    return await leadsRepo.detachLeadsDBFromCampaign(leadsDB.id, campaign.id);
  } catch (error) {
    logger.error('Error detaching LeadsDB from campaign by name:', error);
    throw error;
  }
}

async function getLeadsFromLeadsDBByName(leadsDBName, status, telegramId) {
  try {
    const leadsDB = await getLeadsDBByName(telegramId, leadsDBName);
    return await leadsRepo.getLeadsFromLeadsDB(leadsDB.id, status);
  } catch (error) {
    logger.error('Error getting leads from LeadsDB by name:', error);
    throw error;
  }
}

async function setDefaultLeadsDBByName(telegramId, leadsDBName) {
  try {
    const leadsDB = await getLeadsDBByName(telegramId, leadsDBName);
    await leadsRepo.setDefaultLeadsDB(leadsDB.userId, leadsDB.id);
    logger.info(
      `Default LeadsDB set to "${leadsDBName}" for user ${leadsDB.userId}`,
    );
  } catch (error) {
    logger.error('Error setting default LeadsDB by name:', error);
    throw error;
  }
}

async function getLeadsDBs(telegramId) {
  try {
    const userId = await getUserIdByTelegramId(telegramId);
    return await leadsRepo.getLeadsDBs(userId);
  } catch (error) {
    logger.error('Error getting LeadsDBs:', error);
    throw error;
  }
}

async function getLeadByIdentifier(identifier, platform) {
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
      const phoneNumber = formatPhoneNumber(identifier.split('@')[0]);
      lead = await getLeadByPhone(phoneNumber);
    }

    return lead;
  } catch (error) {
    logger.error('Error getting lead by identifier:', error);
    throw error;
  }
}

async function getLeadById(leadId) {
  try {
    return await leadsRepo.getLeadById(leadId);
  } catch (error) {
    logger.error('Error getting lead by ID:', error);
    throw error;
  }
}

async function getLeadByPhone(phoneNumber) {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    return await leadsRepo.getLeadByPhone(formattedPhone);
  } catch (error) {
    logger.error('Error getting lead by phone number:', error);
    throw error;
  }
}

async function updateLeadMessageInfo(leadId, campaignId, platform) {
  try {
    const updatedLead = await leadsRepo.updateLeadMessageInfo(leadId, {
      campaignId,
      lastMessageTime: new Date(),
      lastPlatform: platform,
    });
    logger.info(
      `Message info updated for lead ${leadId} in campaign ${campaignId} on ${platform}`,
    );
    return updatedLead;
  } catch (error) {
    logger.error('Error updating lead message info:', error);
    throw error;
  }
}

async function getOrCreatetLeadByPhone(phone, platform, chatId, campaignId) {
  try {
    logger.info(
      `Getting or creating lead for phone: ${phone}, platform: ${platform}, chatId: ${chatId}, campaignId: ${campaignId}`,
    );

    // Получаем кампанию
    const campaign = await campaignsMailingService.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with id ${campaignId} not found`);
    }

    // Получаем или создаем LeadsDB для пользователя
    const defaultLeadsDB = await getOrCreateDefaultLeadsDB(
      campaign.userId,
    );

    // Форматируем номер телефона
    const formattedPhone = formatPhoneNumber(phone);

    // Пытаемся найти существующий лид
    let lead = await leadsRepo.getLeadByPhone(formattedPhone);

    if (!lead) {
      // Если лид не найден, создаем новый
      const leadData = {
        userId: campaign.userId,
        leadsDBId: defaultLeadsDB.id, // Используем ID LeadsDB вместо номера телефона
        phone: formattedPhone,
        status: 'NEW',
        campaignId,
      };

      // Добавляем chatId в зависимости от платформы
      if (platform === 'telegram') {
        leadData.telegramChatId = chatId;
      } else if (platform === 'whatsapp' || platform === 'waba') {
        leadData.whatsappChatId = chatId;
      }

      lead = await leadsRepo.createLead(leadData);
      logger.info(`Created new lead: ${JSON.stringify(lead)}`);
    } else {
      // Если лид найден, обновляем его данные
      const updateData = {
        campaignId,
        status: 'NEW',
      };

      if (platform === 'telegram') {
        updateData.telegramChatId = chatId;
      } else if (platform === 'whatsapp' || platform === 'waba') {
        updateData.whatsappChatId = chatId;
      }

      lead = await leadsRepo.updateLead(lead.id, updateData);
      logger.info(`Updated existing lead: ${JSON.stringify(lead)}`);
    }

    return lead;
  } catch (error) {
    logger.error('Error getting or creating lead by phone:', error);
    throw error;
  }
}

async function addLeadsToLeadsDB(leadsDBId, leads) {
  try {
    const processedLeads = leads.map((lead) => ({
      ...lead,
      phone: formatPhoneNumber(lead.phone),
    }));

    return await leadsRepo.addLeadsToLeadsDB(leadsDBId, processedLeads);
  } catch (error) {
    logger.error('Error adding leads to LeadsDB:', error);
    throw error;
  }
}

async function deleteLeadsDB(leadsDBId) {
  try {
    return await leadsRepo.deleteLeadsDB(leadsDBId);
  } catch (error) {
    logger.error('Error deleting LeadsDB:', error);
    throw error;
  }
}

async function attachLeadsDBToCampaign(leadsDBId, campaignId) {
  try {
    const numLeadsDBId = Number(leadsDBId);
    const numCampaignId = Number(campaignId);

    if (Number.isNaN(numLeadsDBId) || Number.isNaN(numCampaignId)) {
      throw new Error('Invalid LeadsDB ID or Campaign ID');
    }

    return await leadsRepo.attachLeadsDBToCampaign(
      numLeadsDBId,
      numCampaignId,
    );
  } catch (error) {
    logger.error('Error attaching LeadsDB to campaign:', error);
    throw error;
  }
}

async function detachLeadsDBFromCampaign(leadsDBId, campaignId) {
  try {
    return await leadsRepo.detachLeadsDBFromCampaign(leadsDBId, campaignId);
  } catch (error) {
    logger.error('Error detaching LeadsDB from campaign:', error);
    throw error;
  }
}

async function getLeadsFromLeadsDB(leadsDBId, status) {
  try {
    return await leadsRepo.getLeadsFromLeadsDB(leadsDBId, status);
  } catch (error) {
    logger.error('Error getting leads from LeadsDB:', error);
    throw error;
  }
}

async function getAttachedLeadsDBs(campaignId) {
  try {
    return await leadsRepo.getAttachedLeadsDBs(campaignId);
  } catch (error) {
    logger.error('Error getting attached LeadsDBs:', error);
    throw error;
  }
}

async function updateLeadStatus(leadId, newStatus) {
  try {
    return await leadsRepo.updateLeadStatus(leadId, newStatus);
  } catch (error) {
    logger.error('Error updating lead status:', error);
    throw error;
  }
}

async function updateLeadStatusByPhone(phone, newStatus) {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    const updatedLead = await leadsRepo.updateLeadStatusByPhone(formattedPhone, newStatus);
    if (!updatedLead) {
      logger.warn(`Lead with phone ${formattedPhone} not found`);
      return null;
    }
    logger.info(`Updated status for lead with phone ${formattedPhone} to ${newStatus}`);
    return updatedLead;
  } catch (error) {
    logger.error('Error updating lead status by phone:', error);
    throw error;
  }
}

async function updateLeadStatusByName(telegramId, leadsDBName, leadId, newStatus) {
  try {
    const leadsDB = await getLeadsDBByName(telegramId, leadsDBName);
    const lead = await leadsRepo.getLead(leadId);
    if (!lead || lead.leadsDBId !== leadsDB.id) {
      throw new Error(
        `Лид с ID ${leadId} не найден в базе "${leadsDBName}".`,
      );
    }
    return await leadsRepo.updateLeadStatus(leadId, newStatus);
  } catch (error) {
    logger.error('Error updating lead status by name:', error);
    throw error;
  }
}

async function updateLeadChatId(leadId, chatId, platform) {
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

async function getLeadByChatId(chatId, platform) {
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

async function deleteLead(leadId) {
  try {
    return await leadsRepo.deleteLead(leadId);
  } catch (error) {
    logger.error('Error deleting lead:', error);
    throw error;
  }
}

async function deleteLeadByName(telegramId, leadsDBName, leadId) {
  try {
    const leadsDB = await getLeadsDBByName(telegramId, leadsDBName);
    const lead = await leadsRepo.getLead(leadId);
    if (!lead || lead.leadsDBId !== leadsDB.id) {
      throw new Error(
        `Лид с ID ${leadId} не найден в базе "${leadsDBName}".`,
      );
    }
    return await leadsRepo.deleteLead(leadId);
  } catch (error) {
    logger.error('Error deleting lead by name:', error);
    throw error;
  }
}

async function getLeadsForCampaign(campaignId) {
  try {
    const attachedLeadsDBs = await getAttachedLeadsDBs(campaignId);
    let allLeads = [];

    for (const leadsDB of attachedLeadsDBs) {
      const leads = await getLeadsFromLeadsDB(leadsDB.id);
      allLeads = allLeads.concat(leads);
    }

    return allLeads;
  } catch (error) {
    logger.error('Error getting leads for campaign:', error);
    throw error;
  }
}

async function createLeadsDB(name, telegramId) {
  try {
    const userId = await getUserIdByTelegramId(telegramId);
    return await leadsRepo.createLeadsDB(name, userId);
  } catch (error) {
    logger.error('Error creating LeadsDB:', error);
    throw error;
  }
}

async function getOrCreateDefaultLeadsDB(userId) {
  try {
    logger.info(`Getting or creating default LeadsDB for user ${userId}`);
    let defaultLeadsDB = await leadsRepo.getDefaultLeadsDB(userId);
    if (!defaultLeadsDB) {
      logger.info(
        `No default LeadsDB found for user ${userId}. Creating new one.`,
      );
      defaultLeadsDB = await leadsRepo.createLeadsDB(
        'Default LeadsDB',
        userId,
        true,
      );
    }
    return defaultLeadsDB;
  } catch (error) {
    logger.error('Error getting or creating default LeadsDB:', error);
    throw error;
  }
}

async function setDefaultLeadsDB(telegramId, leadsDBId) {
  try {
    const userId = await getUserIdByTelegramId(telegramId);
    await leadsRepo.setDefaultLeadsDB(userId, leadsDBId);
    logger.info(`Default LeadsDB set for user ${userId}`);
  } catch (error) {
    logger.error('Error setting default LeadsDB:', error);
    throw error;
  }
}

async function setDefaultLeadsDB(telegramId, leadsDBId) {
  try {
    const userId = await getUserIdByTelegramId(telegramId);
    await leadsRepo.setDefaultLeadsDB(userId, leadsDBId);
    logger.info(`Default LeadsDB set for user ${userId}`);
  } catch (error) {
    logger.error('Error setting default LeadsDB:', error);
    throw error;
  }
}

async function addLeadToCRM(telegramId, leadData) {
  try {
    const userId = await getUserIdByTelegramId(telegramId);
    const defaultLeadsDB = await getOrCreateDefaultLeadsDB(userId);
    const lead = await leadsRepo.saveLead({
      ...leadData,
      leadsDBId: defaultLeadsDB.id,
      userId,
    });
    logger.info(`Lead added to default LeadsDB for user ${userId}`);
    return lead;
  } catch (error) {
    logger.error('Error adding lead to CRM:', error);
    throw error;
  }
}

async function updateLeadTelegramChatId(leadId, telegramChatId) {
  try {
    return await leadsRepo.updateLead(leadId, { telegramChatId });
  } catch (error) {
    logger.error('Error updating lead Telegram chat ID:', error);
    throw error;
  }
}

async function updateLeadWhatsappChatId(leadId, whatsappChatId) {
  try {
    return await leadsRepo.updateLead(leadId, { whatsappChatId });
  } catch (error) {
    logger.error('Error updating lead WhatsApp chat ID:', error);
    throw error;
  }
}

async function getLeadByTelegramChatId(telegramChatId) {
  try {
    return await leadsRepo.getLeadByTelegramChatId(telegramChatId);
  } catch (error) {
    logger.error('Error getting lead by Telegram chat ID:', error);
    throw error;
  }
}

async function getLeadByWhatsappChatId(whatsappChatId) {
  try {
    return await leadsRepo.getLeadByWhatsappChatId(whatsappChatId);
  } catch (error) {
    logger.error('Error getting lead by WhatsApp chat ID:', error);
    throw error;
  }
}

async function setLeadUnavailable(phoneNumber) {
  try {
    const lead = await getLeadByPhone(phoneNumber);
    if (lead) {
      await updateLeadStatus(lead.id, 'UNAVAILABLE');
      logger.info(`Lead with phone ${phoneNumber} set to UNAVAILABLE`);
    }
  } catch (error) {
    logger.error('Error setting lead to UNAVAILABLE:', error);
  }
}

module.exports = {
  getLead,
  updateOrCreateLeadChatId,
  getLeadsDBByName,
  createLead,
  attachLeadsDBToCampaignByName,
  detachLeadsDBFromCampaignByName,
  getLeadsFromLeadsDBByName,
  setDefaultLeadsDBByName,
  addLeadToCRM,
  updateLeadStatusByPhone,
  updateLeadTelegramChatId,
  updateLeadWhatsappChatId,
  getLeadByTelegramChatId,
  getLeadByWhatsappChatId,
  setLeadUnavailable,
  getLeadsDBs,
  createLeadsDB,
  getOrCreateDefaultLeadsDB,
  setDefaultLeadsDB,
  addLeadsToLeadsDB,
  deleteLeadsDB,
  attachLeadsDBToCampaign,
  detachLeadsDBFromCampaign,
  getLeadsFromLeadsDB,
  getAttachedLeadsDBs,
  updateLeadStatus,
  updateLeadStatusByName,
  updateLeadChatId,
  getLeadByChatId,
  deleteLead,
  deleteLeadByName,
  getLeadsForCampaign,
  getLeadByPhone,
  getLeadByIdentifier,
  getLeadById,
  updateLeadMessageInfo,
  getOrCreatetLeadByPhone,
  getLeadsDBByName,
};
