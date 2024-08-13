// src/db/postgres/subscriptions.js

const db = require('./config');
const logger = require('../../utils/logger');

async function addSubscription(userId, durationDays, isRepeating) {
  try {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const query = `
      INSERT INTO subscriptions (user_id, start_date, end_date, is_repeating, duration_days)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const values = [userId, startDate, endDate, isRepeating, durationDays];
    const result = await db.query(query, values);

    logger.info(`Subscription added for user ${userId}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error adding subscription:', error);
    throw error;
  }
}

async function getSubscriptionInfo(userId) {
  logger.info(`getSubscriptionInfo called with userId: ${userId}`);
  try {
    const query = `
      SELECT * FROM subscriptions
      WHERE user_id = $1 AND end_date > NOW()
      ORDER BY end_date DESC
      LIMIT 1
    `;
    logger.info('Executing database query');
    const result = await db.query(query, [userId]);
    logger.info('Database query executed successfully');

    if (result.rows.length === 0) {
      logger.info(`No active subscription found for user ${userId}`);
      return null;
    }

    const subscription = result.rows[0];
    const daysLeft = Math.ceil((new Date(subscription.end_date) - new Date()) / (24 * 60 * 60 * 1000));

    const subscriptionInfo = {
      endDate: subscription.end_date,
      isRepeating: subscription.is_repeating,
      daysLeft: daysLeft > 0 ? daysLeft : 0
    };

    logger.info(`Subscription info for user ${userId}:`, subscriptionInfo);
    return subscriptionInfo;
  } catch (error) {
    logger.error('Error in getSubscriptionInfo:', error);
    throw error;
  }
}

async function checkSubscription(userId) {
  try {
    logger.info(`Checking subscription for user ${userId}`);
    const query = `
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE user_id = $1 AND end_date > NOW()
    `;
    const result = await db.query(query, [userId]);

    const hasActiveSubscription = result.rows[0].count > 0;
    logger.info(`User ${userId} has active subscription: ${hasActiveSubscription}`);
    return hasActiveSubscription;
  } catch (error) {
    logger.error(`Error checking subscription for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  addSubscription,
  getSubscriptionInfo,
  checkSubscription
};