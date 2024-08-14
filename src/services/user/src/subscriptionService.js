// src/services/user/src/subscriptionService.js

const db = require('../../../db/postgres/config');
const logger = require('../../../utils/logger');
const { ensureUserExistsByTgId, ensureUserExistsById, getUserByTgId } = require('../../../utils/userUtils');
const { createUser } = require('./userService');

async function addUserSubscription(userIdentifier, durationDays, isRepeating) {
  try {
    let userId;
    let user;

    if (isNaN(userIdentifier)) {
      // Если userIdentifier - строка (предполагаем, что это username)
      user = await getUserByUsername(userIdentifier);
    } else {
      // Если userIdentifier - число (предполагаем, что это telegram_id)
      user = await getUserByTgId(userIdentifier);
    }

    if (!user) {
      // Если пользователь не найден, создаем нового
      userId = await createUser(userIdentifier, null, null, null);
      logger.info(`New user created with ID: ${userId}`);
    } else {
      userId = user.id;
    }

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


async function getUserSubscriptionInfo(userId) {
  try {
    logger.info(`Getting subscription info for user ID: ${userId}`);
    const query = `
      SELECT * FROM subscriptions
      WHERE user_id = $1 AND end_date > NOW()
      ORDER BY end_date DESC
      LIMIT 1
    `;
    const result = await db.query(query, [userId]);

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

    logger.info(`Subscription info retrieved for user ${userId}:`, subscriptionInfo);
    return subscriptionInfo;
  } catch (error) {
    logger.error('Error getting subscription info:', error);
    throw error;
  }
}

async function checkUserSubscription(userId) {
  try {
    await ensureUserExistsById(userId);
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
    logger.error('Error checking subscription:', error);
    throw error;
  }
}

async function updateUserSubscription(userId, durationDays) {
  try {
    await ensureUserExistsById(userId);

    const query = `
      UPDATE subscriptions
      SET end_date = CASE
        WHEN $2 > 0 THEN GREATEST(end_date, NOW()) + ($2 || ' days')::INTERVAL
        WHEN $2 < 0 THEN GREATEST(end_date + ($2 || ' days')::INTERVAL, NOW())
        ELSE NOW()
      END
      WHERE user_id = $1 AND end_date > NOW()
      RETURNING *
    `;
    const result = await db.query(query, [userId, durationDays]);

    if (result.rows.length === 0) {
      // Если активной подписки нет, создаем новую
      return await addUserSubscription(userId, Math.max(durationDays, 0), false);
    }

    logger.info(`Subscription updated for user ${userId}. Duration change: ${durationDays} days`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error updating subscription:', error);
    throw error;
  }
}


module.exports = {
  addUserSubscription,
  getUserSubscriptionInfo,
  checkUserSubscription,
  updateUserSubscription
};