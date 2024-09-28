// src/bots/middlewares/checkSubscription.js

const logger = require('../../utils/logger');
const { checkUserSubscription } =
  require('../../services/user').subscriptionService;

async function checkSubscription(userId) {
  try {
    return await checkUserSubscription(userId);
  } catch (error) {
    logger.error('Error checking subscription:', error);
    return false;
  }
}

module.exports = { checkSubscription };
