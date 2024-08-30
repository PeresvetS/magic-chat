// src/services/crm/src/bitrixService.js

const crmRepo = require('../../../db/repositories/crmRepo');
const logger = require('../../../utils/logger');

async function setInboundUrl(userId, inboundUrl) {
  try {
    await crmRepo.upsertBitrixIntegration(userId, { bitrixInboundUrl: inboundUrl });
    logger.info(`Updated Bitrix inboundUrl for user ${userId}`);
  } catch (error) {
    logger.error('Error updating Bitrix inboundUrl:', error);
    throw error;
  }
}

async function setOutboundToken(userId, outboundToken) {
  try {
    await crmRepo.upsertBitrixIntegration(userId, { bitrixOutboundToken: outboundToken });
    logger.info(`Updated Bitrix outboundToken for user ${userId}`);
  } catch (error) {
    logger.error('Error updating Bitrix outboundToken:', error);
    throw error;
  }
}

async function getIntegrationInfo(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { bitrixIntegration: true },
    });
    return user ? user.bitrixIntegration : null;
  } catch (error) {
    logger.error('Error getting Bitrix integration info:', error);
    throw error;
  }
}

module.exports = {
  setInboundUrl,
  setOutboundToken,
  getIntegrationInfo
};
