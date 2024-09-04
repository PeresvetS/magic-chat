// src/db/repositories/leadsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');
const { getUserIdByCampaignId } = require('./userRepo');

async function saveLead({ bitrix_id, name, phone, source, status, userId, campaignId }) {
  try {
    const lead = await prisma.lead.upsert({
      where: { bitrixId: bitrix_id },
      update: { name, phone, source, status, userId, campaignId },
      create: { bitrixId: bitrix_id, name, phone, source, status, userId, campaignId }
    });
    logger.info(`Lead saved/updated: ${bitrix_id}`);
    return lead;
  } catch (error) {
    logger.error('Error saving lead to database', error);
    throw error;
  }
}

async function getLeadBitrix(bitrix_id) {
  try {
    return await prisma.lead.findUnique({
      where: { bitrixId: bitrix_id }
    });
  } catch (error) {
    logger.error('Error getting lead from database', error);
    throw error;
  }
}

async function getLead(id) {
  try {
    return await prisma.lead.findUnique({
      where: { id }
    });
  } catch (error) {
    logger.error('Error getting lead from database', error);
    throw error;
  }
}

async function deleteLead(id) {
  try {
    return await prisma.lead.delete({
      where: { id }
    });
  } catch (error) {
    logger.error('Error deleting lead from database', error);
    throw error;
  }
}

async function getUnsentLeads() {
  try {
    return await prisma.lead.findMany({
      where: { status: 'NEW' }
    });
  } catch (error) {
    logger.error('Error getting unsent leads from database', error);
    throw error;
  }
}

async function markLeadAsSent(id) {
  try {
    await prisma.lead.update({
      where: { id },
      data: { status: 'SENT' }
    });
  } catch (error) {
    logger.error('Error marking lead as sent in database', error);
    throw error;
  }
}

async function updateLead(id, data) {
  try {
    return await prisma.lead.update({
      where: { id },
      data
    });
  } catch (error) {
    logger.error('Error updating lead in database', error);
    throw error;
  }
}

async function getLeadsDBs(userId) {
  try {
    return await prisma.leadsDB.findMany({
      where: { userId }
    });
  } catch (error) {
    logger.error('Error getting LeadsDBs:', error);
    throw error;
  }
}

async function addLeadsToLeadsDB(leadsDBId, leads) {
  try {
    const createdLeads = await prisma.lead.createMany({
      data: leads.map(lead => ({
        leadsDBId,
        phone: lead.phone,
        name: lead.name,
        source: lead.source,
        status: 'NEW'
      })),
      skipDuplicates: true,
    });
    logger.info(`Добавлено ${createdLeads.count} лидов в LeadsDB ${leadsDBId}`);
    return createdLeads.count;
  } catch (error) {
    logger.error(`Ошибка при добавлении лидов в LeadsDB ${leadsDBId}:`, error);
    throw error;
  }
}

async function deleteLeadsDB(leadsDBId) {
  try {
    await prisma.leadsDB.delete({
      where: { id: leadsDBId }
    });
    logger.info(`LeadsDB ${leadsDBId} удалена`);
  } catch (error) {
    logger.error(`Ошибка при удалении LeadsDB ${leadsDBId}:`, error);
    throw error;
  }
}

async function attachLeadsDBToCampaign(leadsDBId, campaignId) {
  try {
    await prisma.campaignLeadsDB.create({
      data: {
        leadsDB: {
          connect: { id: leadsDBId }
        },
        campaign: {
          connect: { id: campaignId }
        }
      }
    });
    logger.info(`LeadsDB ${leadsDBId} прикреплена к кампании ${campaignId}`);
  } catch (error) {
    logger.error(`Ошибка при прикреплении LeadsDB ${leadsDBId} к кампании ${campaignId}:`, error);
    throw error;
  }
}

async function getOrCreatetLeadByPhone(phone, platform, chatId, campaignId) {
  try {
    const lead = await getLeadByPhone(phone);
    if (lead) {
      return lead;
    }
    const userId = await getUserIdByCampaignId(campaignId);
    if (!userId) {
      throw new Error(`Не удалось найти пользователя для кампании с ID ${campaignId}`);
    }
    const result = await createLead(platform, chatId, userId, phone);
    return result;

} catch (error) {
    logger.error(`Ошибка при получении или создании лида по номеру телефона ${phone}:`, error);
    throw error;
  }
}

async function detachLeadsDBFromCampaign(leadsDBId, campaignId) {
  try {
    await prisma.campaignLeadsDB.delete({
      where: {
        leadsDBId_campaignId: {
          leadsDBId,
          campaignId
        }
      }
    });
    logger.info(`LeadsDB ${leadsDBId} откреплена от кампании ${campaignId}`);
  } catch (error) {
    logger.error(`Ошибка при откреплении LeadsDB ${leadsDBId} от кампании ${campaignId}:`, error);
    throw error;
  }
}

async function getLeadsFromLeadsDB(leadsDBId, status) {
  try {
    return await prisma.lead.findMany({
      where: {
        leadsDBId,
        status
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    logger.error(`Ошибка при получении лидов из LeadsDB ${leadsDBId}:`, error);
    throw error;
  }
}

async function updateLeadStatus(leadId, newStatus) {
  try {
    return await prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus }
    });
  } catch (error) {
    logger.error(`Ошибка при обновлении статуса лида ${leadId}:`, error);
    throw error;
  }
}

async function getAttachedLeadsDBs(campaignId) {
  try {
    const attachments = await prisma.campaignLeadsDB.findMany({
      where: { campaignId },
      include: { leadsDB: true }
    });
    return attachments.map(attachment => attachment.leadsDB);
  } catch (error) {
    logger.error(`Ошибка при получении прикрепленных баз лидов для кампании ${campaignId}:`, error);
    throw error;
  }
}

async function getDefaultLeadsDB(userId) {
  try {
    return await prisma.leadsDB.findFirst({
      where: { userId, isDefault: true }
    });
  } catch (error) {
    logger.error('Error getting default LeadsDB:', error);
    throw error;
  }
}

async function createLeadsDB(name, userId, isDefault = false) {
  try {
    return await prisma.leadsDB.create({
      data: { name, userId, isDefault }
    });
  } catch (error) {
    logger.error('Error creating LeadsDB:', error);
    throw error;
  }
}

async function createLead(platform, chatId, userId) {
  const leadDb = getDefaultLeadsDB(userId);
  if (!leadDb) {
    throw new Error('No default LeadsDB found for user');
  }
  const leadsDBId = leadDb.id;
  logger.info(`Created lead with id ${leadsDBId}`);
  if (platform === 'telegram') {
    return await prisma.lead.create({
      data: { telegramChatId: chatId, leadsDBId, userId }
    }); 
  } else if (platform === 'whatsapp') {
    return await prisma.lead.create({
      data: { whatsappChatId: chatId, leadsDBId, userId }
    });
  } else {
    throw new Error('Неизвестная платформа');
  }
}

async function setDefaultLeadsDB(userId, leadsDBId) {
  try {
    // Сначала сбрасываем isDefault для всех LeadsDB пользователя
    await prisma.leadsDB.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    // Затем устанавливаем isDefault для выбранной LeadsDB
    await prisma.leadsDB.update({
      where: { id: leadsDBId, userId },
      data: { isDefault: true }
    });
  } catch (error) {
    logger.error('Error setting default LeadsDB:', error);
    throw error;
  }
}

async function getLeadByTelegramChatId(telegramChatId) {
  return await prisma.lead.findFirst({
    where: { telegramChatId }
  });
}

async function getLeadByWhatsappChatId(whatsappChatId) {
  return await prisma.lead.findFirst({
    where: { whatsappChatId }
  });
}

async function getLeadByPhone(phone) {
  try {
    const phoneString = String(phone); // Преобразуем входное значение в строку
    return await prisma.lead.findFirst({
      where: { phone: phoneString }
    });
  } catch (error) {
    logger.error('Error getting lead by phone number:', error);
    throw error;
  }
}

async function updateLeadMessageInfo(leadId, data) {
  return await prisma.lead.update({
    where: { id: leadId },
    data: {
      campaignId: data.campaignId,
      lastMessageTime: data.lastMessageTime,
      lastPlatform: data.lastPlatform
    }
  });
}

module.exports = {
  getLead,
  saveLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadsDBs,
  deleteLeadsDB,
  createLeadsDB,
  getLeadBitrix,
  markLeadAsSent,
  getUnsentLeads,
  getLeadByPhone,
  updateLeadStatus,
  setDefaultLeadsDB,
  addLeadsToLeadsDB,
  getDefaultLeadsDB,
  getLeadsFromLeadsDB,
  getAttachedLeadsDBs,
  updateLeadMessageInfo,
  attachLeadsDBToCampaign,
  getOrCreatetLeadByPhone,
  getLeadByWhatsappChatId,
  getLeadByTelegramChatId,
  detachLeadsDBFromCampaign,
};