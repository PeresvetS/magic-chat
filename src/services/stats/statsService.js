// src/services/stats/statsService.js

const { usersTable, parsedUsersTable, parsingCampaignsTable } = require('../../db');
const logger = require('../../utils/logger');

async function getGlobalStats() {
  try {
    const [users, parsedUsers, campaigns] = await Promise.all([
      usersTable.select().firstPage(),
      parsedUsersTable.select().firstPage(),
      parsingCampaignsTable.select().firstPage()
    ]);

    return {
      totalUsers: users.length,
      totalParsedUsers: parsedUsers.length,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.fields.status === 'in_progress').length
    };
  } catch (error) {
    logger.error('Error getting global stats:', error);
    throw error;
  }
}

module.exports = {
  getGlobalStats
};