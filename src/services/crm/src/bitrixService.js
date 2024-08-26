// src/services/crm/src/bitrixService.js

const crmRepo = require('../../../db/repositories/crmRepo');
const logger = require('../../../utils/logger');

async function updateIntegration(userId, webhookId, inboundUrl, outboundToken) {
  try {
    await crmRepo.updateUserBitrixIntegration(userId, webhookId, inboundUrl, outboundToken);
    logger.info(`Updated Bitrix integration for user ${userId}`);
  } catch (error) {
    logger.error('Error updating Bitrix integration:', error);
    throw error;
  }
}

async function getIntegrationInfo(userId) {
  try {
    const user = await crmRepo.getUserByBitrixWebhookId(userId);
    return user ? user.bitrixIntegration : null;
  } catch (error) {
    logger.error('Error getting Bitrix integration info:', error);
    throw error;
  }
}

module.exports = {
  updateIntegration,
  getIntegrationInfo
};