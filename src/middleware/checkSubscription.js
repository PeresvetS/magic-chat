// src/middleware/checkSubscription.js

const { checkUserSubscription } = require('../services/user');
const logger = require('../utils/logger');

async function checkSubscription(userId) {
  try {
    return await checkUserSubscription(userId);
  } catch (error) {
    logger.error('Error checking subscription:', error);
    return false;
  }
}

module.exports = { checkSubscription };