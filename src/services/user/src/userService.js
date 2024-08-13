// src/services/user/userService.js

const { usersTable } = require('../../../db');
const logger = require('../../../utils/logger');
const { getUserId } = require('../../../utils/userUtils');
const { getLimits } = require('./limitService');
const { getSubscriptionInfo } = require('./subscriptionService');
const { getPhoneNumbers } = require('./userPhoneService');

async function getUserInfo(userIdentifier) {
  try {
    const userId = await getUserId(userIdentifier);
    const records = await usersTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('User not found');
    }

    const user = records[0].fields;
    const phoneNumbers = await getPhoneNumbers(userId);
    const limits = await getLimits(userId);
    const subscription = await getSubscriptionInfo(userId);

    return {
      userId: user.user_id,
      username: user.username,
      isBanned: user.is_banned,
      registeredAt: user.registered_at,
      phoneNumbers: phoneNumbers,
      limits: limits,
      subscription: subscription
    };
  } catch (error) {
    logger.error('Error getting user info:', error);
    throw error;
  }
}

async function getAccountInfo(userId) {
  try {
    const userInfo = await getUserInfo(userId);
    const limits = await getLimits(userId);
    return {
      ...userInfo,
      limits
    };
  } catch (error) {
    logger.error('Error getting account info:', error);
    throw error;
  }
}

async function createUser(userId, username) {
  try {
    const existingRecords = await usersTable.select({
      filterByFormula: `OR({user_id} = '${userId}', {username} = '${username}')`
    }).firstPage();

    if (existingRecords.length > 0) {
      throw new Error('User already exists');
    }

    await usersTable.create([
      {
        fields: {
          user_id: userId,
          username: username,
          is_banned: false,
          registered_at: new Date().toISOString()
        }
      }
    ]);

    logger.info(`Created new user: ${username} (${userId})`);
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

async function banUser(userIdentifier) {
  await updateUserBanStatus(userIdentifier, true);
}

async function unbanUser(userIdentifier) {
  await updateUserBanStatus(userIdentifier, false);
}

async function updateUserBanStatus(userIdentifier, isBanned) {
  try {
    const userId = await getUserId(userIdentifier);
    const records = await usersTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('User not found');
    }

    await usersTable.update([
      {
        id: records[0].id,
        fields: { is_banned: isBanned }
      }
    ]);

    logger.info(`User ${userId} has been ${isBanned ? 'banned' : 'unbanned'}`);
  } catch (error) {
    logger.error(`Error ${isBanned ? 'banning' : 'unbanning'} user:`, error);
    throw error;
  }
}


module.exports = {
  getAccountInfo,
  getUserInfo,
  createUser,
  banUser,
  unbanUser
};