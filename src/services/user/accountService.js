// src/services/accountService.js   

const { getUserInfo } = require('./userService');
const { getSubscriptionInfo } = require('./subscriptionService');
const { getLimits } = require('./limitService');
const logger = require('../../utils/logger');

async function getAccountInfo(userId) {
  try {
    const userInfo = await getUserInfo(userId);
    const limits = await getLimits(userId);
    return {
      ...userInfo,
      limits
    };
  } catch (error) {
    logger.error('Error getting account info:', error);
    throw error;
  }
}

module.exports = {
  getAccountInfo,
  getSubscriptionInfo // Реэкспортируем функцию из subscriptionService
};