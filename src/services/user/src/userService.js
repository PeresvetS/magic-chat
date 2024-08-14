// src/services/user/src/userService.js

const db = require('../../../db/postgres/config');
const logger = require('../../../utils/logger');
const { ensureUserExistsById, getUserByUsername, getUserByTgId } = require('../../../utils/userUtils');
const { getLimits } = require('./limitService');
const { getUserSubscriptionInfo } = require('./subscriptionService');
const { getPhoneNumbers } = require('./userPhoneService');


async function getUserInfo(id) {
  try {
    const user = await ensureUserExistsById(id);
    const phoneNumbers = await getPhoneNumbers(user.id);
    const limits = await getLimits(user.id);
    const subscription = await getUserSubscriptionInfo(user.id);

    return {
      id: user.id,
      telegramId: user.telegram_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
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

async function createUser(telegramId, username = null, firstName = null, lastName = null) {
  try {
    const query = 'INSERT INTO users (telegram_id, username, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id';
    const { rows } = await db.query(query, [telegramId, username, firstName, lastName]);
    logger.info(`Created new user with telegram_id: ${telegramId}`);
    return rows[0].id;
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

async function getAllUsers() {
  try {
    const query = 'SELECT * FROM users ORDER BY id';
    const { rows } = await db.query(query);
    return rows;
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
}


async function getUserByIdentifier(identifier) {
  let user;
  try {
    logger.info(`Getting user by identifier: ${identifier}`);

    if (!isNaN(identifier)) {
      // Если identifier - число, проверяем telegram_id
      user = await getUserByTgId(identifier);
    } else {
      // Если identifier - строка, считаем его username
      user = await getUserByUsername(identifier)
    }
    return user;
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

async function updateUserBanStatus(id, isBanned) {
  try {
    await ensureUserExistsById(id);
    const query = 'UPDATE users SET is_banned = $1 WHERE id = $2';
    await db.query(query, [isBanned, id]);
    logger.info(`User ${id} has been ${isBanned ? 'banned' : 'unbanned'}`);
  } catch (error) {
    logger.error(`Error ${isBanned ? 'banning' : 'unbanning'} user:`, error);
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