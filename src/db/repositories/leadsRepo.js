// src/db/repositories/leadsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

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

async function getLead(bitrix_id) {
  try {
    return await prisma.lead.findUnique({
      where: { bitrixId: bitrix_id }
    });
  } catch (error) {
    logger.error('Error getting lead from database', error);
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

async function addLeadsToCampaign(campaignId, leads) {
  try {
    const createdLeads = await prisma.lead.createMany({
      data: leads.map(lead => ({
        campaignId,
        phone: lead.phone,
        name: lead.name,
        source: lead.source,
        status: 'NEW'
      })),
      skipDuplicates: true,
    });
    logger.info(`Добавлено ${createdLeads.count} лидов в кампанию ${campaignId}`);
    return createdLeads.count;
  } catch (error) {
    logger.error(`Ошибка при добавлении лидов в кампанию ${campaignId}:`, error);
    throw error;
  }
}

async function getCampaignByName(name) {
  try {
    return await prisma.campaignMailing.findUnique({
      where: { name }
    });
  } catch (error) {
    logger.error(`Ошибка при получении кампании по имени ${name}:`, error);
    throw error;
  }
}

async function getLeadsForCampaign(campaignId, status = 'NEW') {
  try {
    return await prisma.lead.findMany({
      where: {
        campaignId,
        status
      }
    });
  } catch (error) {
    logger.error('Error getting leads for campaign:', error);
    throw error;
  }
}

async function updateLeadStatus(id, newStatus) {
  try {
    return await prisma.lead.update({
      where: { id },
      data: { status: newStatus }
    });
  } catch (error) {
    logger.error('Error updating lead status:', error);
    throw error;
  }
}

module.exports = {
  getLead,
  saveLead,
  markLeadAsSent,
  getUnsentLeads,
  updateLeadStatus,
  getCampaignByName,
  addLeadsToCampaign,
  getLeadsForCampaign,
};