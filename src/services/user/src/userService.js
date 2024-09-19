// src/services/user/src/userService.js

const { userRepo } = require('../../../db');
const { getLimits } = require('./limitService');
const logger = require('../../../utils/logger');
const { getUserSubscriptionInfo } = require('./subscriptionService');
const { getUserPhoneNumbers } = require('../../phone').phoneNumberService;


async function getUserInfo(telegramId) {
  try {
    const user = await this.getUserByTgId(telegramId);
    if (!user) {
      throw new Error(`User with ID ${telegramId} not found`);
    }
    const phoneNumbers = await getUserPhoneNumbers(user.id);
    const limits = await getLimits(user.id);
    const subscription = await getUserSubscriptionInfo(user.id);

    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isBanned: user.isBanned,
      registeredAt: user.registeredAt,
      phoneNumbers,
      limits,
      subscription,
      isSubscribed: new Date() < subscription?.endDate,
    };
  } catch (error) {
    logger.error('Error getting user info:', error);
    throw error;
  }
}

async function getUserIdByTelegramId(telegramId) {
  try {
    const user = await userRepo.getUserByTgId(telegramId);
    if (!user) {
      throw new Error(`User not found for Telegram ID: ${telegramId}`);
    }
    return user.id;
  } catch (error) {
    logger.error('Error getting user ID by Telegram ID:', error);
    throw error;
  }
}

async function createUser(
  telegramId,
  username = null,
  firstName = null,
  lastName = null,
) {
  try {
    const user = await userRepo.createUser(
      telegramId,
      username,
      firstName,
      lastName,
    );
    logger.info(`Created new user with telegram_id: ${telegramId}`);
    return user.id;
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

async function getAllUsers() {
  try {
    return await userRepo.getAllUsers();
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
}

async function getUserByTgId(telegramId) {
  try {
    return await userRepo.getUserByTgId(telegramId);
  } catch (error) {
    logger.error('Error getting user by Telegram ID:', error);
    throw error;
  }
}

async function getUserByIdentifier(identifier) {
  try {
    logger.info(`Getting user by identifier: ${identifier}`);

    if (!Number.isNaN(identifier)) {
      // Если identifier - число, проверяем telegram_id
      return await this.getUserByTgId(identifier);
    }
    // Если identifier - строка, считаем его username
    return await userRepo.getUserByUsername(identifier);
  } catch (error) {
    logger.error('Error in getUserByIdentifier:', error);
    throw error;
  }
}

async function banUser(userIdentifier) {
  await updateUserBanStatus(userIdentifier, true);
}

async function unbanUser(userIdentifier) {
  await updateUserBanStatus(userIdentifier, false);
}

async function updateUserBanStatus(telegramId, isBanned) {
  try {
    const user = await this.getUserByTgId(telegramId);
    if (!user) {
      throw new Error(`User with ID ${telegramId} not found`);
    }
    await userRepo.updateUserBanStatus(telegramId, isBanned);
    logger.info(
      `User ${telegramId} has been ${isBanned ? 'banned' : 'unbanned'}`,
    );
  } catch (error) {
    logger.error(`Error ${isBanned ? 'banning' : 'unbanning'} user:`, error);
    throw error;
  }
}

async function setUserOpenAIKey(userId, openaiApiKey) {
  try {
    return await userRepo.setUserOpenAIKey(userId, openaiApiKey);
  } catch (error) {
    logger.error('Error in setUserOpenAIKey service:', error);
    throw error;
  }
}

module.exports = {
  banUser,
  unbanUser,
  createUser,
  getUserInfo,
  getAllUsers,
  getUserByTgId,
  getUserByIdentifier,
  setUserOpenAIKey,
  getUserIdByTelegramId,
};
