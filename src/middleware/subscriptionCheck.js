// src/middleware/subscriptionCheck.js

const { checkSubscription } = require('../services/user/subscriptionService');
const { getUserId } = require('../utils/userUtils');

async function subscriptionCheck(msg) {
  try {
    const userId = await getUserId(msg.from.id);
    return await checkSubscription(userId);
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
}

module.exports = { subscriptionCheck };