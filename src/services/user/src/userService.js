// src/services/user/src/userService.js

const logger = require('../../../utils/logger');
const { userRepo, phoneNumberRepo } = require('../../../db');
const { getLimits } = require('./limitService');
const { getUserSubscriptionInfo } = require('./subscriptionService');

async function getUserInfo(telegramId) {
  try {
    const user = await userRepo.getUserById(telegramId);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    const phoneNumbers = await phoneNumberRepo.getPhoneNumbers(user.id);
    const limits = await getLimits(user.id);
    const subscription = await getUserSubscriptionInfo(user.id);

    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isBanned: user.isBanned,
      registeredAt: user.registeredAt,
      phoneNumbers: phoneNumbers,
      limits: limits,
      subscription: subscription
    };
  } catch (error) {
    logger.error('Error getting user info:', error);
    throw error;
  }
}

async function createUser(telegramId, username = null, firstName = null, lastName = null) {
  try {
    const user = await userRepo.createUser(telegramId, username, firstName, lastName);
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

async function getUserByIdentifier(identifier) {
  try {
    logger.info(`Getting user by identifier: ${identifier}`);

    if (!isNaN(identifier)) {
      // Если identifier - число, проверяем telegram_id
      return await userRepo.getUserByTgId(identifier);
    } else {
      // Если identifier - строка, считаем его username
      return await userRepo.getUserByUsername(identifier);
    }
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
    const user = await userRepo.getUserById(telegramId);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    await userRepo.updateUserBanStatus(id, isBanned);
    logger.info(`User ${id} has been ${isBanned ? 'banned' : 'unbanned'}`);
  } catch (error) {
    logger.error(`Error ${isBanned ? 'banning' : 'unbanning'} user:`, error);
    throw error;
  }
}
async function getUserByTgId(telegramId) {
  try {
    return await userRepo.getUserByTgId(telegramId);
  } catch (error) {
    logger.error('Error getting user by telegramId:', error);
    throw error;
  }
}

module.exports = {
  getUserInfo,
  createUser,
  banUser,
  unbanUser,
  getAllUsers,
  getUserByIdentifier,
  getUserByTgId,
};