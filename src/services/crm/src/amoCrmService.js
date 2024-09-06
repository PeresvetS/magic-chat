// src/services/crm/src/amoCrmService.js

const crmRepo = require('../../../db/repositories/crmRepo');
const logger = require('../../../utils/logger');

async function setInboundUrl(userId, inboundUrl) {
  try {
    await crmRepo.upsertAmoCrmIntegration(userId, {
      amoCrmInboundUrl: inboundUrl,
    });
    logger.info(`Updated AmoCRM inboundUrl for user ${userId}`);
  } catch (error) {
    logger.error('Error updating AmoCRM inboundUrl:', error);
    throw error;
  }
}

async function setOutboundToken(userId, outboundToken) {
  try {
    await crmRepo.upsertAmoCrmIntegration(userId, {
      amoCrmOutboundToken: outboundToken,
    });
    logger.info(`Updated AmoCRM outboundToken for user ${userId}`);
  } catch (error) {
    logger.error('Error updating AmoCRM outboundToken:', error);
    throw error;
  }
}

async function getIntegrationInfo(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { amoCrmIntegration: true },
    });
    return user ? user.amoCrmIntegration : null;
  } catch (error) {
    logger.error('Error getting AmoCRM integration info:', error);
    throw error;
  }
}

module.exports = {
  setInboundUrl,
  setOutboundToken,
  getIntegrationInfo,
};
