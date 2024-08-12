// src/db/postgres/phoneNumbers.js

const db = require('./config');
const logger = require('../../utils/logger');

const DEFAULT_MAX_INACTIVITY_TIME = 60 * 60 * 1000; // 60 minutes in milliseconds

async function getPhoneNumber() {
  try {
    const query = 'SELECT phone_number FROM phone_numbers ORDER BY created_at DESC LIMIT 1';
    const result = await db.query(query);
    return result.rows.length > 0 ? result.rows[0].phone_number : null;
  } catch (error) {
    logger.error('Ошибка при получении номера телефона:', error);
    throw error;
  }
}

async function setPhoneNumber(number, userId) {
  try {
    const query = `
      INSERT INTO phone_numbers (phone_number, user_id, max_inactivity_time)
      VALUES ($1, $2, $3)
    `;
    await db.query(query, [number, userId, DEFAULT_MAX_INACTIVITY_TIME]);
  } catch (error) {
    logger.error('Ошибка при установке номера телефона:', error);
    throw error;
  }
}

async function getPhoneNumberHistory() {
  try {
    const query = 'SELECT phone_number, user_id, created_at FROM phone_numbers ORDER BY created_at DESC';
    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    logger.error('Ошибка при получении истории номеров телефона:', error);
    throw error;
  }
}

async function getMaxInactivityTime(phoneNumber) {
  try {
    const query = 'SELECT max_inactivity_time FROM phone_numbers WHERE phone_number = $1';
    const result = await db.query(query, [phoneNumber]);
    return result.rows.length > 0 ? result.rows[0].max_inactivity_time : DEFAULT_MAX_INACTIVITY_TIME;
  } catch (error) {
    logger.error(`Ошибка при получении MAX_INACTIVITY_TIME для номера ${phoneNumber}:`, error);
    return DEFAULT_MAX_INACTIVITY_TIME;
  }
}

async function setMaxInactivityTime(phoneNumber, time) {
  try {
    const query = 'UPDATE phone_numbers SET max_inactivity_time = $1 WHERE phone_number = $2';
    const result = await db.query(query, [time, phoneNumber]);
    if (result.rowCount === 0) {
      logger.warn(`Попытка обновить MAX_INACTIVITY_TIME для несуществующего номера: ${phoneNumber}`);
    } else {
      logger.info(`MAX_INACTIVITY_TIME для номера ${phoneNumber} успешно обновлено: ${time}`);
    }
  } catch (error) {
    logger.error(`Ошибка при установке MAX_INACTIVITY_TIME для номера ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  getPhoneNumber,
  setPhoneNumber,
  getPhoneNumberHistory,
  getMaxInactivityTime,
  setMaxInactivityTime
};