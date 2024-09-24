// src/db/repositories/phoneNumberRotationRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function getRotationState(userId, campaignId, platform) {
  try {
    return await prisma.phoneNumberRotation.findUnique({
      where: {
        userId_campaignId_platform: {
          userId,
          campaignId,
          platform,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting rotation state:', error);
    throw error;
  }
}

async function updateRotationState(userId, campaignId, platform, currentIndex) {
  try {
    return await prisma.phoneNumberRotation.upsert({
      where: {
        userId_campaignId_platform: {
          userId,
          campaignId,
          platform,
        },
      },
      update: { currentIndex },
      create: {
        userId,
        campaignId,
        platform,
        currentIndex,
      },
    });
  } catch (error) {
    logger.error('Error updating rotation state:', error);
    throw error;
  }
}

module.exports = {
  getRotationState,
  updateRotationState,
};