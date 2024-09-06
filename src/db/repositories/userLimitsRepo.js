// src/db/repositories/userLimitsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function setLimit(userId, limitType, limitValue) {
  try {
    return await prisma.userLimits.upsert({
      where: { userId },
      update: { [`${limitType}Limit`]: limitValue },
      create: { userId, [`${limitType}Limit`]: limitValue },
    });
  } catch (error) {
    logger.error('Error setting limit:', error);
    throw error;
  }
}

async function getLimits(userId) {
  try {
    return await prisma.userLimits.findUnique({
      where: { userId },
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
        return prisma.parsedUser.count({
          where: { campaignParsing: { userId } },
        });
      case 'phones':
        return prisma.phoneNumber.count({
          where: { userId },
          include: {
            telegramAccount: true,
            whatsappAccount: true,
          },
        });
      case 'campaigns':
        return prisma.campaignParsing.count({ where: { userId } });
      case 'contacts':
        return prisma.parsedUser.count({
          where: {
            campaignParsing: { userId },
            isProcessed: true,
          },
        });
      case 'leads':
        return prisma.parsedUser.count({
          where: {
            campaignParsing: { userId },
            processingStatus: 'lead',
          },
        });
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
  getCurrentUsage,
};
