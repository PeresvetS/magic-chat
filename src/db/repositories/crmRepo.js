// src/db/repositories/crmRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function getUserByBitrixToken(bitrixOutboundToken) {
  try {
    return await prisma.user.findFirst({
      where: {
        bitrixIntegration: {
          bitrixOutboundToken,
        },
      },
      include: {
        bitrixIntegration: true,
      },
    });
  } catch (error) {
    logger.error('Error getting user by Bitrix token:', error);
    throw error;
  }
}

async function upsertBitrixIntegration(userId, data) {
  try {
    const defaultValues = {
      bitrixInboundUrl: '',
      bitrixOutboundToken: '',
    };

    const createData = { ...defaultValues, ...data, userId: BigInt(userId) };
    const updateData = data;

    return await prisma.bitrixIntegration.upsert({
      where: { userId },
      update: updateData,
      create: createData,
    });
  } catch (error) {
    logger.error('Error upserting Bitrix integration:', error);
    throw error;
  }
}

async function getUserByAmoCrmToken(amoCrmOutboundToken) {
  try {
    return await prisma.user.findFirst({
      where: {
        amoCrmIntegration: {
          amoCrmOutboundToken,
        },
      },
      include: {
        amoCrmIntegration: true,
      },
    });
  } catch (error) {
    logger.error('Error getting user by AmoCRM token:', error);
    throw error;
  }
}

async function upsertAmoCrmIntegration(userId, data) {
  try {
    const defaultValues = {
      amoCrmInboundUrl: '',
      amoCrmOutboundToken: '',
    };

    const createData = { ...defaultValues, ...data, userId: BigInt(userId) };
    const updateData = data;

    return await prisma.amoCrmIntegration.upsert({
      where: { userId },
      update: updateData,
      create: createData,
    });
  } catch (error) {
    logger.error('Error upserting AmoCRM integration:', error);
    throw error;
  }
}

module.exports = {
  getUserByBitrixToken,
  upsertBitrixIntegration,
  getUserByAmoCrmToken,
  upsertAmoCrmIntegration,
};