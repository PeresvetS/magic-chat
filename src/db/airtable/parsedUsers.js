// src/db/airtable/parsedUsers.js

const { parsedUsersTable } = require('./config');
const { chunkArray } = require('./utils');
const logger = require('../../utils/logger');

async function saveParsedUsers(campaignId, groupUsername, categorizedUsers) {
  try {
    const records = Object.entries(categorizedUsers).flatMap(([category, users]) =>
      users.map(user => ({
        fields: {
          campaign_id: campaignId,
          group_username: groupUsername,
          user_id: user.id,
          username: user.username || '',
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          bio: user.about || '',
          category: category,
          parsed_at: new Date().toISOString(),
          last_seen: user.status ? new Date(user.status.wasOnline * 1000).toISOString() : '',
          has_channel: !!user.username
        }
      }))
    );

    const chunks = chunkArray(records, 10);

    for (const chunk of chunks) {
      await parsedUsersTable.create(chunk);
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