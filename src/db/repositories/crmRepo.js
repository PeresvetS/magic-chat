// src/db/repositories/сrmRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');


async function getUserByBitrixWebhookId(bitrixWebhookId) {
  try {
    return await prisma.user.findFirst({
      where: {
        bitrixIntegration: {
          bitrixWebhookId
        }
      },
      include: {
        bitrixIntegration: true
      }
    });
  } catch (error) {
    logger.error('Error getting user by Bitrix webhook ID:', error);
    throw error;
  }
}

async function updateUserBitrixIntegration(userId, bitrixWebhookId, bitrixInboundUrl, bitrixOutboundToken) {
  try {
    return await prisma.bitrixIntegration.upsert({
      where: { userId },
      update: { bitrixWebhookId, bitrixInboundUrl, bitrixOutboundToken },
      create: { userId, bitrixWebhookId, bitrixInboundUrl, bitrixOutboundToken }
    });
  } catch (error) {
    logger.error('Error updating user Bitrix integration:', error);
    throw error;
  }
}

async function getUserByAmoCrmWebhookId(amoCRMWebhookId) {
  try {
    return await prisma.user.findFirst({
      where: {
        amoCRMIntegration: {
          amoCRMWebhookId
        }
      },
      include: {
        amoCRMIntegration: true
      }
    });
  } catch (error) {
    logger.error('Error getting user by AmoCRM webhook ID:', error);
    throw error;
  }
}

async function updateUserAmoCrmIntegration(userId, amoCRMWebhookId, amoCRMInboundUrl, amoCRMOutboundToken) {
  try {
    return await prisma.amoCRMIntegration.upsert({
      where: { userId },
      update: { amoCRMWebhookId, amoCRMInboundUrl, amoCRMOutboundToken },
      create: { userId, amoCRMWebhookId, amoCRMInboundUrl, amoCRMOutboundToken }
    });
  } catch (error) {
    logger.error('Error updating user AmoCRM integration:', error);
    throw error;
  }
}

module.exports = {
  getUserByBitrixWebhookId,
  updateUserBitrixIntegration,
  getUserByAmoCrmWebhookId,
  updateUserAmoCrmIntegration
};