// src/db/repositories/messageStatsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveMessageStats(userId, phoneNumber, tokenCount) {
  try {
    return await prisma.messageStat.create({
      data: {
        userId,
        phoneNumber,
        tokensUsed: tokenCount
      }
    });
  } catch (error) {
    logger.error('Error saving message stats:', error);
    throw error;
  }
}

module.exports = {
  saveMessageStats
};