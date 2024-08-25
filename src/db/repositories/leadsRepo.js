// src/db/src/leads.js

const prisma = require('../prisma');
const logger = require('../../utils/logger');

async function saveLead({ bitrix_id, name, phone, source, status }) {
  try {
    const lead = await prisma.lead.upsert({
      where: { bitrixId: bitrix_id },
      update: { name, phone, source },
      create: { bitrixId: bitrix_id, name, phone, source, status }
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

module.exports = {
  saveLead,
  getLead
};