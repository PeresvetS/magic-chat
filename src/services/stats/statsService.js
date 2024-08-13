// src/services/stats/statsService.js

const db = require('../../db/postgres/config');
// const { usersTable, parsedUsersTable, parsingCampaignsTable } = require('../../db');
const logger = require('../../utils/logger');

async function getGlobalStats() {
  try {
    // Для PostgreSQL
    const stats = {
      totalUsers: 0,
      totalParsedUsers: 0,
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalPhoneNumbers: 0,
      activeSubscriptions: 0
    };

    // Получаем статистику из базы данных PostgreSQL
    const queries = [
      'SELECT COUNT(*) FROM users',
      'SELECT COUNT(*) FROM parsed_users',
      'SELECT COUNT(*) FROM parsing_campaigns',
      'SELECT COUNT(*) FROM parsing_campaigns WHERE status = \'in_progress\'',
      'SELECT COUNT(*) FROM phone_numbers',
      'SELECT COUNT(*) FROM subscriptions WHERE end_date > NOW()'
    ];

    const results = await Promise.all(queries.map(query => db.query(query)));

    stats.totalUsers = parseInt(results[0].rows[0].count);
    stats.totalParsedUsers = parseInt(results[1].rows[0].count);
    stats.totalCampaigns = parseInt(results[2].rows[0].count);
    stats.activeCampaigns = parseInt(results[3].rows[0].count);
    stats.totalPhoneNumbers = parseInt(results[4].rows[0].count);
    stats.activeSubscriptions = parseInt(results[5].rows[0].count);

    return stats;

    // Для Airtable (закомментировано)
    /*
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
    */
  } catch (error) {
    logger.error('Error getting global stats:', error);
    throw error;
  }
}

module.exports = {
  getGlobalStats
};