// src/services/stats/statsService.js

const logger = require('../../utils/logger');
const prisma = require('../../db/utils/prisma');
const { messageStatsRepo } = require('../../db');

async function getGlobalStats() {
  try {
    const stats = {
      totalUsers: 0,
      totalParsedUsers: 0,
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalPhoneNumbers: 0,
      activeSubscriptions: 0,
      totalTelegramAccounts: 0,
      totalWhatsAppAccounts: 0,
      totalWABAAccounts: 0,
      activeTelegramAccounts: 0,
      activeWhatsAppAccounts: 0,
      activeWABAAccounts: 0,
    };

    // Получаем статистику из базы данных с использованием Prisma
    const [
      totalUsers,
      totalParsedUsers,
      totalCampaigns,
      activeCampaigns,
      totalPhoneNumbers,
      activeSubscriptions,
      telegramAccounts,
      whatsAppAccounts,
      WABAAccounts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.parsedUser.count(),
      prisma.parsingCampaign.count(),
      prisma.parsingCampaign.count({ where: { status: 'in_progress' } }),
      prisma.phoneNumber.count(),
      prisma.subscription.count({ where: { endDate: { gt: new Date() } } }),
      prisma.telegramAccount.findMany(),
      prisma.whatsappAccount.findMany(),
      prisma.wABAAccount.findMany(),
    ]);

    stats.totalUsers = totalUsers;
    stats.totalParsedUsers = totalParsedUsers;
    stats.totalCampaigns = totalCampaigns;
    stats.activeCampaigns = activeCampaigns;
    stats.totalPhoneNumbers = totalPhoneNumbers;
    stats.activeSubscriptions = activeSubscriptions;

    stats.totalTelegramAccounts = telegramAccounts.length;
    stats.totalWhatsAppAccounts = whatsAppAccounts.length;
    stats.totalWABAAccounts = WABAAccounts.length;

    stats.activeTelegramAccounts = telegramAccounts.filter(
      (account) => account.isAuthenticated,
    ).length;
    stats.activeWhatsAppAccounts = whatsAppAccounts.filter(
      (account) => account.isAuthenticated,
    ).length;
    stats.activeWABAAccounts = WABAAccounts.filter(
      (account) => account.isAuthenticated,
    ).length;

    return stats;
  } catch (error) {
    logger.error('Error getting global stats:', error);
    throw error;
  }
}

async function saveMessageStats(userId, phoneNumber, tokenCount) {
  try {
    await messageStatsRepo.saveMessageStats(userId, phoneNumber, tokenCount);
    logger.info(
      `Saved message stats for user ${userId}: ${tokenCount} tokens used`,
    );
  } catch (error) {
    logger.error('Error saving message stats:', error);
  }
}

module.exports = {
  getGlobalStats,
  saveMessageStats,
};
