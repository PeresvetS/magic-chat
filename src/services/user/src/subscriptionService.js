// src/services/user/subscriptionService.js

const { subscriptionsTable } = require('../../../db');
const logger = require('../../../utils/logger');
const { getUserId } = require('../../../utils/userUtils');

async function addSubscription(userIdentifier, durationDays, isRepeating) {
  try {
    const userId = await getUserId(userIdentifier);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await subscriptionsTable.create([
      {
        fields: {
          user_id: userId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_repeating: isRepeating,
          duration_days: durationDays
        }
      }
    ]);

    logger.info(`Subscription added for user ${userId}`);
  } catch (error) {
    logger.error('Error adding subscription:', error);
    throw error;
  }
}

async function getSubscriptionInfo(userIdentifier) {
  try {
    const userId = await getUserId(userIdentifier);
    const records = await subscriptionsTable.select({
      filterByFormula: `{user_id} = '${userId}'`,
      sort: [{ field: 'end_date', direction: 'desc' }],
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) {
      return null;
    }

    const subscription = records[0].fields;
    const daysLeft = Math.ceil((new Date(subscription.end_date) - new Date()) / (24 * 60 * 60 * 1000));

    return {
      endDate: subscription.end_date,
      isRepeating: subscription.is_repeating,
      daysLeft: daysLeft > 0 ? daysLeft : 0
    };
  } catch (error) {
    logger.error('Error getting subscription info:', error);
    throw error;
  }
}

async function checkSubscription(userId) {
  try {
    const records = await subscriptionsTable.select({
      filterByFormula: `AND({user_id} = '${userId}', {end_date} > '${new Date().toISOString()}')`
    }).firstPage();

    return records.length > 0;
  } catch (error) {
    logger.error('Error checking subscription:', error);
    throw error;
  }
}

module.exports = {
  addSubscription,
  getSubscriptionInfo,
  checkSubscription
};


