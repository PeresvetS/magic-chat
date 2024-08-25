// src/db/src/campaigns.js

const prisma = require('../prisma');
const logger = require('../../utils/logger');

async function createParsingCampaign(name, groups, audienceDescription, maxUsers = 100, depth = 2) {
  try {
    const campaign = await prisma.parsingCampaign.create({
      data: {
        name,
        groups: groups.join(','),
        audienceDescription,
        status: 'pending',
        maxUsers,
        depth
      }
    });
    return campaign.id;
  } catch (error) {
    logger.error('Error creating parsing campaign:', error);
    throw error;
  }
}

async function updateCampaignStatus(campaignId, status) {
  try {
    await prisma.parsingCampaign.update({
      where: { id: campaignId },
      data: { status }
    });
  } catch (error) {
    logger.error(`Error updating campaign status for campaign ${campaignId}:`, error);
    throw error;
  }
}

async function getCampaignStats() {
  try {
    return await prisma.parsingCampaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        totalParsed: true,
        processedCount: true,
        isFullyProcessed: true
      }
    });
  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    throw error;
  }
}

async function markCampaignAsFullyProcessed(campaignId) {
  try {
    await prisma.parsingCampaign.update({
      where: { id: campaignId },
      data: { isFullyProcessed: true }
    });
  } catch (error) {
    logger.error(`Error marking campaign ${campaignId} as fully processed:`, error);
    throw error;
  }
}

async function updateCampaignStats(campaignId, totalParsed, processedCount) {
  try {
    await prisma.parsingCampaign.update({
      where: { id: campaignId },
      data: { totalParsed, processedCount }
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