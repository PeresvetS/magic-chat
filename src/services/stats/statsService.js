// src/services/stats/statsService.js

const logger = require('../../utils/logger');
const prisma = require('../../db/prisma');

async function getGlobalStats() {
  try {
    const stats = {
      totalUsers: 0,
      totalParsedUsers: 0,
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalPhoneNumbers: 0,
      activeSubscriptions: 0
    };

    // Получаем статистику из базы данных с использованием Prisma
    const [
      totalUsers,
      totalParsedUsers,
      totalCampaigns,
      activeCampaigns,
      totalPhoneNumbers,
      activeSubscriptions
    ] = await Promise.all([
      prisma.user.count(),
      prisma.parsedUser.count(),
      prisma.parsingCampaign.count(),
      prisma.parsingCampaign.count({ where: { status: 'in_progress' } }),
      prisma.phoneNumber.count(),
      prisma.subscription.count({ where: { endDate: { gt: new Date() } } })
    ]);

    stats.totalUsers = totalUsers;
    stats.totalParsedUsers = totalParsedUsers;
    stats.totalCampaigns = totalCampaigns;
    stats.activeCampaigns = activeCampaigns;
    stats.totalPhoneNumbers = totalPhoneNumbers;
    stats.activeSubscriptions = activeSubscriptions;

    return stats;

  } catch (error) {
    logger.error('Error getting global stats:', error);
    throw error;
  }
}

module.exports = {
  getGlobalStats
};