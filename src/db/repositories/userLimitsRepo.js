// src/db/repositories/userLimitsRepository.js

const prisma = require('../prisma');
const logger = require('../../utils/logger');

async function setLimit(userId, limitType, limitValue) {
  try {
    return await prisma.userLimits.upsert({
      where: { userId: userId },
      update: { [`${limitType}Limit`]: limitValue },
      create: { userId: userId, [`${limitType}Limit`]: limitValue }
    });
  } catch (error) {
    logger.error('Error setting limit:', error);
    throw error;
  }
}

async function getLimits(userId) {
  try {
    return await prisma.userLimits.findUnique({
      where: { userId: userId }
    });
  } catch (error) {
    logger.error('Error getting limits:', error);
    throw error;
  }
}

async function getCurrentUsage(userId, limitType) {
  try {
    switch (limitType) {
      case 'parsing':
        return prisma.parsedUser.count({ where: { userId: userId } });
      case 'phones':
        return prisma.phoneNumber.count({ where: { userId: userId, isActive: true } });
      case 'campaigns':
        return prisma.parsingCampaign.count({ where: { userId: userId } });
      case 'contacts':
        return prisma.parsedUser.count({ where: { userId: userId, isProcessed: true } });
      case 'leads':
        return prisma.parsedUser.count({ where: { userId: userId, processingStatus: 'lead' } });
      default:
        throw new Error(`Unknown limit type: ${limitType}`);
    }
  } catch (error) {
    logger.error('Error getting current usage:', error);
    throw error;
  }
}

module.exports = {
  setLimit,
  getLimits,
  getCurrentUsage
};