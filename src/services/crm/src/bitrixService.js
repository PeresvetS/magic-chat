// src/services/crm/src/bitrixService.js

const crmRepo = require('../../../db/repositories/crmRepo');
const prisma = require('../../../db/utils/prisma');
const logger = require('../../../utils/logger');

async function setInboundUrl(userId, inboundUrl) {
  try {
    await crmRepo.upsertBitrixIntegration(userId, {
      bitrixInboundUrl: inboundUrl,
    });
    logger.info(`Updated Bitrix inboundUrl for user ${userId}`);
  } catch (error) {
    logger.error('Error updating Bitrix inboundUrl:', error);
    throw error;
  }
}

async function setOutboundToken(userId, outboundToken) {
  try {
    await crmRepo.upsertBitrixIntegration(userId, {
      bitrixOutboundToken: outboundToken,
    });
    logger.info(`Updated Bitrix outboundToken for user ${userId}`);
  } catch (error) {
    logger.error('Error updating Bitrix outboundToken:', error);
    throw error;
  }
}

async function getIntegrationInfo(userId) {
  try {
    if (!userId) {
      logger.warn('getIntegrationInfo called with undefined userId');
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(userId) },
      include: { bitrixIntegration: true },
    });

    if (!user) {
      logger.warn(`User not found for userId: ${userId}`);
      return null;
    }

    return user.bitrixIntegration;
  } catch (error) {
    logger.error(
      `Error getting Bitrix integration info for userId ${userId}:`,
      error,
    );
    throw error;
  }
}

module.exports = {
  setInboundUrl,
  setOutboundToken,
  getIntegrationInfo,
};
