// src/services/user/src/userPhoneService.js

const db = require('../../../db/postgres/config');
const logger = require('../../../utils/logger');
const { getUserById } = require('../../../utils/userUtils');

async function getPhoneNumbers(userId) {
  try {
    const query = 'SELECT phone_number FROM phone_numbers WHERE user_id = $1';
    const { rows } = await db.query(query, [userId]);
    return rows.map(row => row.phone_number);
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function disablePhoneNumbers(userIdentifier) {
  try {
    const userId = await getUserById(userIdentifier);
    const query = 'UPDATE phone_numbers SET is_active = false WHERE user_id = $1';
    await db.query(query, [userId]);
    logger.info(`Disabled phone numbers for user ${userId}`);
  } catch (error) {
    logger.error('Error disabling phone numbers:', error);
    throw error;
  }
}

module.exports = {
  getPhoneNumbers,
  disablePhoneNumbers
};