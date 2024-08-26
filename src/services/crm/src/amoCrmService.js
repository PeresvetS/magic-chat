// src/services/crm/src/amoCrmService.js

const crmRepo = require('../../../db/repositories/crmRepo');
const logger = require('../../../utils/logger');

async function updateIntegration(userId, webhookId, inboundUrl, outboundToken) {
  try {
    await crmRepo.updateUserAmoCrmIntegration(userId, webhookId, inboundUrl, outboundToken);
    logger.info(`Updated AmoCRM integration for user ${userId}`);
  } catch (error) {
    logger.error('Error updating AmoCRM integration:', error);
    throw error;
  }
}

async function getIntegrationInfo(userId) {
  try {
    const user = await crmRepo.getUserByAmoCrmWebhookId(userId);
    return user ? user.amoCRMIntegration : null;
  } catch (error) {
    logger.error('Error getting AmoCRM integration info:', error);
    throw error;
  }
}

module.exports = {
  updateIntegration,
  getIntegrationInfo
};