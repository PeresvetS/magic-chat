// src/db/repositories/messageStatsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveMessageStats(userId, phoneNumber, tokensUsed) {
  try {
    return await prisma.messageStat.create({
      data: {
        userId: BigInt(userId),
        phoneNumber,
        tokensUsed,
      },
    });
  } catch (error) {
    logger.error(`Error saving message stats: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveMessageStats,
};
