// src/db/repositories/subscriptionsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function addSubscription(userId, durationDays, isRepeating) {
  try {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        startDate,
        endDate,
        isRepeating,
        durationDays
      }
    });

    logger.info(`Subscription added for user ${userId}`);
    return subscription.id;
  } catch (error) {
    logger.error('Error adding subscription:', error);
    throw error;
  }
}

async function getSubscriptionInfo(userId) {
  logger.info(`getSubscriptionInfo called with userId: ${userId}`);
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        endDate: { gt: new Date() }
      },
      orderBy: { endDate: 'desc' }
    });

    if (!subscription) {
      logger.info(`No active subscription found for user ${userId}`);
      return null;
    }

    const daysLeft = Math.ceil((subscription.endDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));

    const subscriptionInfo = {
      endDate: subscription.endDate,
      isRepeating: subscription.isRepeating,
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
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        endDate: { gt: new Date() }
      }
    });

    const hasActiveSubscription = !!subscription;
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