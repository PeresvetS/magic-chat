// src/services/user/src/userService.js

const db = require('../../../db/postgres/config');
const logger = require('../../../utils/logger');
const { ensureUserExistsById, getUserByUsername, getUserIdByTgId } = require('../../../utils/userUtils');
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

async function createUser(telegramId, username, firstName, lastName) {
  try {
    const query = 'INSERT INTO users (telegram_id, username, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id';
    const { rows } = await db.query(query, [telegramId, username, firstName, lastName]);
    logger.info(`Created new user: ${username} (${telegramId})`);
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
  try {
    logger.info(`Getting user by identifier: ${identifier}`);
    let query;
    let params;

    if (!isNaN(identifier)) {
      // Если identifier - число, проверяем сначала id, потом telegram_id
      query = 'SELECT * FROM users WHERE id = $1 OR telegram_id = $1';
      params = [parseInt(identifier)];
    } else {
      // Если identifier - строка, считаем его username
      query = 'SELECT * FROM users WHERE username = $1';
      params = [identifier.startsWith('@') ? identifier.slice(1) : identifier];
    }

    const { rows } = await db.query(query, params);

    if (rows.length === 0) {
      logger.warn(`User not found for identifier: ${identifier}`);
      return null;
    }

    logger.info(`User found: ${JSON.stringify(rows[0])}`);
    return rows[0];
  } catch (error) {
    logger.error('Error in getUserByIdentifier:', error);
    throw error;
  }
}

async function getUserByTgId(telegramId) {
  try {
      const query = 'SELECT * FROM users WHERE telegram_id = $1';
      const { rows } = await db.query(query, [telegramId]);
      return rows[0];
  } catch (error) {
    logger.error('Error getting user by telegramId:', error);
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