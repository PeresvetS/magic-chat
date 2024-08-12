// src/db/postgres/campaigns.js

const db = require('./config');
const logger = require('../../utils/logger');

async function createParsingCampaign(name, groups, audienceDescription, maxUsers = 100, depth = 2) {
  try {
    const query = `
      INSERT INTO parsing_campaigns (name, groups, audience_description, status, max_users, depth)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [name, groups.join(','), audienceDescription, 'pending', maxUsers, depth];
    const result = await db.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error creating parsing campaign:', error);
    throw error;
  }
}

async function updateCampaignStatus(campaignId, status) {
  try {
    const query = 'UPDATE parsing_campaigns SET status = $1 WHERE id = $2';
    await db.query(query, [status, campaignId]);
  } catch (error) {
    logger.error(`Error updating campaign status for campaign ${campaignId}:`, error);
    throw error;
  }
}

async function getCampaignStats() {
  try {
    const query = `
      SELECT id, name, status, total_parsed, processed_count, is_fully_processed
      FROM parsing_campaigns
    `;
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    throw error;
  }
}

async function markCampaignAsFullyProcessed(campaignId) {
  try {
    const query = 'UPDATE parsing_campaigns SET is_fully_processed = TRUE WHERE id = $1';
    await db.query(query, [campaignId]);
  } catch (error) {
    logger.error(`Error marking campaign ${campaignId} as fully processed:`, error);
    throw error;
  }
}

async function updateCampaignStats(campaignId, totalParsed, processedCount) {
  try {
    const query = `
      UPDATE parsing_campaigns
      SET total_parsed = $1, processed_count = $2
      WHERE id = $3
    `;
    await db.query(query, [totalParsed, processedCount, campaignId]);
  } catch (error) {
    logger.error(`Error updating campaign stats for campaign ${campaignId}:`, error);
    throw error;
  }
}

module.exports = {
  createParsingCampaign,
  updateCampaignStatus,
  getCampaignStats,
  markCampaignAsFullyProcessed,
  updateCampaignStats
};