// src/db/postgres/parsedUsers.js

const db = require('./config');
const { chunkArray } = require('./utils');
const logger = require('../../utils/logger');

async function saveParsedUsers(campaignId, groupUsername, categorizedUsers) {
  try {
    const query = `
      INSERT INTO parsed_users (
        campaign_id, group_username, user_id, username, first_name, last_name, 
        bio, category, parsed_at, last_seen, has_channel
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = Object.entries(categorizedUsers).flatMap(([category, users]) =>
      users.map(user => [
        campaignId,
        groupUsername,
        user.id,
        user.username || '',
        user.firstName || '',
        user.lastName || '',
        user.about || '',
        category,
        new Date().toISOString(),
        user.status ? new Date(user.status.wasOnline * 1000).toISOString() : null,
        !!user.username
      ])
    );

    const chunks = chunkArray(values, 10);

    for (const chunk of chunks) {
      await db.query(query, chunk);
    }

    logger.info(`Saved parsed users for campaign ${campaignId}, group ${groupUsername}`);
  } catch (error) {
    logger.error(`Error saving parsed users for campaign ${campaignId}, group ${groupUsername}:`, error);
    throw error;
  }
}

module.exports = {
  saveParsedUsers
};