// src/services/user/src/limitService.js

const logger = require('../../../utils/logger');
const { userLimitsRepo } = require('../../../db');
const { ensureUserExistsById } = require('../../../utils/userUtils');

async function setLimit(userId, limitType, limitValue) {
  try {
    await ensureUserExistsById(userId);
    await userRepo.setLimit(userId, limitType, limitValue);
    logger.info(`Set ${limitType} limit to ${limitValue} for user ${userId}`);
  } catch (error) {
    logger.error('Error setting limit:', error);
    throw error;
  }
}

async function getLimits(userId) {
  try {
    await ensureUserExistsById(userId);
    const limits = await userLimitsRepo.getLimits(userId);

    return {
      parsing: limits?.parsingLimit ?? null,
      phones: limits?.phonesLimit ?? null,
      campaigns: limits?.campaignsLimit ?? null,
      contacts: limits?.contactsLimit ?? null,
      leads: limits?.leadsLimit ?? null
    };
  } catch (error) {
    logger.error('Error getting limits:', error);
    throw error;
  }
}

async function checkLimit(userIdentifier, limitType) {
  try {
    const userId = await ensureUserExistsById(userIdentifier);
    const limits = await userLimitsRepo.getLimits(userId);

    if (!limits) {
      return true; // No limits set, allow action
    }

    const limitValue = limits[`${limitType}Limit`];

    if (limitValue === null || limitValue === undefined) {
      return true; // No specific limit set, allow action
    }

    const currentUsage = await userLimitsRepo.getCurrentUsage(userId, limitType);
    return currentUsage < limitValue;
  } catch (error) {
    logger.error('Error checking limit:', error);
    throw error;
  }
}

module.exports = {
  setLimit,
  getLimits,
  checkLimit,
};