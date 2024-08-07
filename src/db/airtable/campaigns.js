// src/db/airtable/campaigns.js

const { parsingCampaignsTable } = require('./config');
const logger = require('../../utils/logger');

async function createParsingCampaign(name, groups, audienceDescription, maxUsers = 100, depth = 2) {
  try {
    const record = await parsingCampaignsTable.create({
      name,
      groups: groups.join(','),
      audience_description: audienceDescription,
      created_at: new Date().toISOString(),
      status: 'pending',
      max_users: maxUsers,
      depth: depth,
      total_parsed: 0,
      processed_count: 0,
      is_fully_processed: false
    });
    return record.id;
  } catch (error) {
    logger.error('Error creating parsing campaign:', error);
    throw error;
  }
}

async function updateCampaignStatus(campaignId, status) {
  try {
    await parsingCampaignsTable.update(campaignId, { status });
  } catch (error) {
    logger.error(`Error updating campaign status for campaign ${campaignId}:`, error);
    throw error;
  }
}

async function getCampaignStats() {
  try {
    const records = await parsingCampaignsTable.select().all();
    return records.map(record => ({
      id: record.id,
      name: record.get('name'),
      status: record.get('status'),
      totalParsed: record.get('total_parsed'),
      processedCount: record.get('processed_count'),
      isFullyProcessed: record.get('is_fully_processed')
    }));
  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    throw error;
  }
}

async function markCampaignAsFullyProcessed(campaignId) {
  try {
    await parsingCampaignsTable.update(campaignId, { 
      is_fully_processed: true
    });
  } catch (error) {
    logger.error(`Error marking campaign ${campaignId} as fully processed:`, error);
    throw error;
  }
}

async function updateCampaignStats(campaignId, totalParsed, processedCount) {
  try {
    await parsingCampaignsTable.update(campaignId, { 
      total_parsed: totalParsed,
      processed_count: processedCount
    });
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