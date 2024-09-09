// src/services/user/src/subscriptionService.js

const logger = require('../../../utils/logger');
const { ensureUserExistsById } = require('./utils');
const { userRepo, subscriptionsRepo } = require('../../../db');
const с = require('../../../config');

async function addUserSubscription(userIdentifier, durationDays, isRepeating) {
  try {
    let userId;
    let user;

    if (Number.isNaN(userIdentifier)) {
      user = await userRepo.getUserByUsername(userIdentifier);
    } else {
      user = await userRepo.getUserByTgId(userIdentifier);
    }

    if (!user) {
      logger.info(`User ${userIdentifier} not found. Creating new user...`);
      // Если пользователь не найден, создаем нового
      user = await userRepo.createUser(userIdentifier, null, null, null);
      logger.info(`New user created with ID: ${user.id}`);
    }
    userId = user.id;

    const subscriptionId = await subscriptionsRepo.addSubscription(
      userId,
      durationDays,
      isRepeating,
    );

    logger.info(`Subscription added for user ${userId}`);
    return subscriptionId;
  } catch (error) {
    logger.error('Error adding subscription:', error);
    throw error;
  }
}

async function getUserSubscriptionInfo(userId) {
  try {
    await ensureUserExistsById(userId);
    logger.info(`Getting subscription info for user ID: ${userId}`);
    const subscriptionInfo =
      await subscriptionsRepo.getSubscriptionInfo(userId);

    if (!subscriptionInfo) {
      logger.info(`No active subscription found for user ${userId}`);
      return null;
    }

    logger.info(
      `Subscription info retrieved for user ${userId}:`,
      subscriptionInfo,
    );
    return subscriptionInfo;
  } catch (error) {
    logger.error('Error getting subscription info:', error);
    throw error;
  }
}

async function checkUserSubscription(userId) {
  try {
    await ensureUserExistsById(userId);
    const hasActiveSubscription =
      await subscriptionsRepo.checkSubscription(userId);
    logger.info(
      `User ${userId} has active subscription: ${hasActiveSubscription}`,
    );
    return hasActiveSubscription;
  } catch (error) {
    logger.error('Error checking subscription:', error);
    throw error;
  }
}

async function updateUserSubscription(userId, durationDays) {
  try {
    await ensureUserExistsById(userId);

    const currentSubscription =
      await subscriptionsRepo.getSubscriptionInfo(userId);

    if (!currentSubscription) {
      // Если активной подписки нет, создаем новую
      return await addUserSubscription(
        userId,
        Math.max(durationDays, 0),
        false,
      );
    }

    const newEndDate = new Date(
      Math.max(
        currentSubscription.endDate.getTime(),
        Date.now() +
          durationDays *
            с.HOURS_IN_A_DAY *
            с.MINUTES_IN_AN_HOUR *
            с.SECONDS_IN_A_MINUTE *
            с.MILLISECONDS_IN_A_SECOND,
      ),
    );

    const updatedSubscription = await subscriptionsRepo.updateSubscription(
      userId,
      newEndDate,
      currentSubscription.isRepeating,
    );

    logger.info(
      `Subscription updated for user ${userId}. Duration change: ${durationDays} days`,
    );
    return updatedSubscription;
  } catch (error) {
    logger.error('Error updating subscription:', error);
    throw error;
  }
}

module.exports = {
  addUserSubscription,
  getUserSubscriptionInfo,
  checkUserSubscription,
  updateUserSubscription,
};
