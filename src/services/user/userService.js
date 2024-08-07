// src/services/user/userService.js

const { usersTable, phoneNumbersTable } = require('../../db/airtable');
const logger = require('../../utils/logger');
const { getUserId } = require('../../utils/userUtils');
const { getLimits } = require('./limitService');
const { getSubscriptionInfo } = require('./subscriptionService');

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

async function getPhoneNumbers(userId) {
  const records = await phoneNumbersTable.select({
    filterByFormula: `{user_id} = '${userId}'`
  }).firstPage();

  return records.map(record => ({
    number: record.fields.phone_number,
    isActive: record.fields.is_active
  }));
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

async function disablePhoneNumbers(userIdentifier) {
  try {
    const userId = await getUserId(userIdentifier);
    const records = await phoneNumbersTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    for (const record of records) {
      await phoneNumbersTable.update([
        {
          id: record.id,
          fields: { is_active: false }
        }
      ]);
    }

    logger.info(`Disabled phone numbers for user ${userId}`);
  } catch (error) {
    logger.error('Error disabling phone numbers:', error);
    throw error;
  }
}

module.exports = {
  getUserInfo,
  createUser,
  banUser,
  unbanUser,
  disablePhoneNumbers
};