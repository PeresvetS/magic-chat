// 

const db = require('../db/postgres/config');
const logger = require('./logger');

async function getUserByTgId(telegramId) {
  try {
    logger.info(`Getting user for telegramId: ${telegramId}`);
    
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await db.query(query, [telegramId]);

    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      logger.info(`User with telegramId ${telegramId} not found`);
      return null;
    }
  } catch (error) {
    logger.error('Error getting user:', error);
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    logger.info(`Getting user for username: ${username}`);
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [cleanUsername]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      logger.info(`User with username ${cleanUsername} not found`);
      return null;
    }
  } catch (error) {
    logger.error('Error getting user by username:', error);
    throw error;
  }
}

async function ensureUserExistsByTgId(telegramId) {
  const user = await getUserByTgId(telegramId);
  if (user === null) {
    throw new Error(`User with telegramId ${telegramId} not found`);
  }
  return user.id;
}

async function getUserById(id) {
  try {
    logger.info(`Getting user by ID: ${id}`);
    
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      logger.info(`User with ID ${id} not found`);
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    throw error;
  }
}

async function ensureUserExistsById(id) {
  const user = await getUserById(id);
  if (user === null) {
    throw new Error(`User with ID ${id} not found`);
  }
  return user;
}

module.exports = {
  ensureUserExistsByTgId,
  getUserById,
  ensureUserExistsById,
  getUserByUsername,
  getUserByTgId
};