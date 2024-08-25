// src/services/campaign/campaignService.js

const { parsingCampaignsTable } = require('../../db').campaignsRepo;
const logger = require('../../utils/logger');

async function createCampaign(userId, campaignName) {
  try {
    const record = await parsingCampaignsTable.create([
      {
        fields: {
          user_id: userId,
          name: campaignName,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      }
    ]);
    logger.info(`Created campaign ${campaignName} for user ${userId}`);
    return record[0].id;
  } catch (error) {
    logger.error('Error creating campaign:', error);
    throw error;
  }
}

async function listCampaigns(userId) {
  try {
    const records = await parsingCampaignsTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    return records.map(record => ({
      id: record.id,
      name: record.fields.name,
      status: record.fields.status
    }));
  } catch (error) {
    logger.error('Error listing campaigns:', error);
    throw error;
  }
}

async function getCampaignStats(userId, campaignId) {
  try {
    const record = await parsingCampaignsTable.find(campaignId);
    if (record.fields.user_id !== userId) {
      throw new Error('Campaign not found or access denied');
    }
    return {
      name: record.fields.name,
      status: record.fields.status,
      totalParsed: record.fields.total_parsed || 0,
      processedCount: record.fields.processed_count || 0
    };
  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    throw error;
  }
}

async function updateCampaignStatus(campaignId, status) {
  try {
    await parsingCampaignsTable.update(campaignId, { status });
    logger.info(`Updated status for campaign ${campaignId} to ${status}`);
  } catch (error) {
    logger.error(`Error updating campaign status for campaign ${campaignId}:`, error);
    throw error;
  }
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaignStats,
  updateCampaignStatus
};