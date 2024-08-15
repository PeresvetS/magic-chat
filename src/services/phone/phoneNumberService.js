// src/services/phone/phoneNumberService.js

const db = require('../../db/postgres/config');
const logger = require('../../utils/logger');
const { ensureUserExistsById } = require('../../utils/userUtils');

function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^\+[1-9]\d{5,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    logger.warn(`Invalid phone number format: ${phoneNumber}`);
    throw new Error('Неверный формат номера телефона. Используйте международный формат, начиная с +');
  }
  logger.info(`Phone number validated successfully: ${phoneNumber}`);
}

async function addPhoneNumber(userId, phoneNumber, isPremium = false) {
  try {
    validatePhoneNumber(phoneNumber);
    logger.info(`Attempting to add phone number ${phoneNumber} for user ${userId}`);

    await ensureUserExistsById(userId);

    // Проверяем, существует ли уже такой номер телефона
    const checkQuery = 'SELECT * FROM phone_numbers WHERE phone_number = $1';
    const checkResult = await db.query(checkQuery, [phoneNumber]);

    if (checkResult.rows.length > 0) {
      // Номер уже существует, обновляем его данные
      const updateQuery = `
        UPDATE phone_numbers 
        SET user_id = $1, is_premium = $2, updated_at = NOW()
        WHERE phone_number = $3
        RETURNING *
      `;
      const { rows } = await db.query(updateQuery, [userId, isPremium, phoneNumber]);
      logger.info(`Phone number ${phoneNumber} updated for user with ID ${userId}`);
      return { ...rows[0], is_new: false };
    } else {
      // Номер не существует, добавляем новый
      const insertQuery = `
        INSERT INTO phone_numbers (user_id, phone_number, is_premium, daily_limit, total_limit, created_at, updated_at, is_authenticated)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), FALSE)
        RETURNING *
      `;
      const values = [userId, phoneNumber, isPremium, 40, null];
      const { rows } = await db.query(insertQuery, values);
      logger.info(`Phone number ${phoneNumber} added successfully for user with ID ${userId}`);
      return { ...rows[0], is_new: true };
    }
  } catch (error) {
    logger.error(`Error adding/updating phone number ${phoneNumber} for user with ID ${userId}:`, error);
    throw error;
  }
}

async function getUserPhoneNumbers(userId) {
  logger.info(`Getting phone numbers for user ${userId}`);
  try {
    const query = `
      SELECT pn.phone_number, pn.is_authenticated
      FROM phone_numbers pn
      JOIN users u ON u.id = pn.user_id
      WHERE u.id = $1
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function removePhoneNumber(userId, phoneNumber) {
  logger.info(`removePhoneNumber called with userId: ${userId}, phoneNumber: ${phoneNumber}`);

  try {
    if (!phoneNumber) {
      logger.warn('Phone number is undefined or empty');
      throw new Error('Номер телефона не может быть пустым');
    }
    
    await ensureUserExistsById(userId);

    const query = 'DELETE FROM phone_numbers WHERE user_id = $1 AND phone_number = $2';
    const result = await db.query(query, [userId, phoneNumber]);

    if (result.rowCount === 0) {
      logger.warn(`Phone number ${phoneNumber} not found for user ${userId}`);
      throw new Error('Номер телефона не найден');
    }

    logger.info(`Removed phone number ${phoneNumber} for user ${userId}`);
  } catch (error) {
    logger.error(`Error removing phone number ${phoneNumber} for user ${userId}:`, error);
    throw error;
  }
}

async function updatePhoneNumberStatus(phoneNumber, isBanned, banType = null) {
  try {
    const query = 'UPDATE phone_numbers SET is_banned = $1, ban_type = $2, updated_at = $3 WHERE phone_number = $4';
    const { rowCount } = await db.query(query, [isBanned, banType, new Date(), phoneNumber]);
    if (rowCount === 0) {
      throw new Error('Phone number not found');
    }
    logger.info(`Updated status for phone number ${phoneNumber}: banned=${isBanned}, type=${banType}`);
  } catch (error) {
    logger.error('Error updating phone number status:', error);
    throw error;
  }
}

async function updatePhoneNumberStats(phoneNumber, userId) {
  try {
    // Начинаем транзакцию
    await db.query('BEGIN');

    // Проверяем, существует ли запись о контакте
    const checkContactQuery = `
      SELECT * FROM phone_number_contacts
      WHERE phone_number = $1 AND user_id = $2
    `;
    const contactResult = await db.query(checkContactQuery, [phoneNumber, userId]);

    let isNewContact = false;
    if (contactResult.rows.length === 0) {
      // Если контакт новый, добавляем его
      const insertContactQuery = `
        INSERT INTO phone_number_contacts (phone_number, user_id)
        VALUES ($1, $2)
      `;
      await db.query(insertContactQuery, [phoneNumber, userId]);
      isNewContact = true;
    }

    // Обновляем статистику
    const updateStatsQuery = `
      UPDATE phone_numbers
      SET 
        messages_sent_today = messages_sent_today + 1,
        messages_sent_total = messages_sent_total + 1,
        contacts_reached_today = contacts_reached_today + $1,
        contacts_reached_total = contacts_reached_total + $1,
        updated_at = NOW()
      WHERE phone_number = $2
      RETURNING *
    `;
    const updateResult = await db.query(updateStatsQuery, [isNewContact ? 1 : 0, phoneNumber]);

    // Завершаем транзакцию
    await db.query('COMMIT');

    if (updateResult.rows.length > 0) {
      logger.info(`Updated stats for ${phoneNumber}: +1 message, +${isNewContact ? 1 : 0} contact`);
      return updateResult.rows[0];
    } else {
      logger.warn(`No phone number found for ${phoneNumber}`);
      return null;
    }
  } catch (error) {
    // В случае ошибки отменяем транзакцию
    await db.query('ROLLBACK');
    logger.error(`Error updating phone number stats for ${phoneNumber}:`, error);
    throw error;
  }
}

async function setPhoneNumberLimit(phoneNumber, dailyLimit, totalLimit = null) {
  try {
    const query = 'UPDATE phone_numbers SET daily_limit = $1, total_limit = $2, updated_at = $3 WHERE phone_number = $4';
    const { rowCount } = await db.query(query, [dailyLimit, totalLimit, new Date(), phoneNumber]);
    if (rowCount === 0) {
      throw new Error('Phone number not found');
    }
    logger.info(`Updated limits for phone number ${phoneNumber}: daily=${dailyLimit}, total=${totalLimit}`);
  } catch (error) {
    logger.error('Error setting phone number limits:', error);
    throw error;
  }
}

async function getPhoneNumberInfo(phoneNumber) {
  try {
    const query = 'SELECT * FROM phone_numbers WHERE phone_number = $1';
    const { rows } = await db.query(query, [phoneNumber]);
    if (rows.length === 0) {
      throw new Error('Phone number not found');
    }
    return rows[0];
  } catch (error) {
    logger.error('Error getting phone number info:', error);
    throw error;
  }
}

async function resetDailyStats() {
  try {
    const query = `
      UPDATE phone_numbers 
      SET messages_sent_today = 0, contacts_reached_today = 0, updated_at = $1
    `;
    await db.query(query, [new Date()]);
    logger.info('Daily stats reset for all phone numbers');
  } catch (error) {
    logger.error('Error resetting daily stats:', error);
    throw error;
  }
}

async function setPhoneAuthenticated(phoneNumber, isAuthenticated) {
  logger.info(`Setting authentication status for phone number ${phoneNumber} to ${isAuthenticated}`);
  try {
    const query = 'UPDATE phone_numbers SET is_authenticated = $1, updated_at = NOW() WHERE phone_number = $2';
    const result = await db.query(query, [isAuthenticated, phoneNumber]);
    if (result.rowCount === 0) {
      throw new Error(`Phone number ${phoneNumber} not found`);
    }
    logger.info(`Authentication status updated for ${phoneNumber}`);
  } catch (error) {
    logger.error(`Error setting authentication status for phone number ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  addPhoneNumber,
  removePhoneNumber,
  updatePhoneNumberStatus,
  updatePhoneNumberStats,
  setPhoneNumberLimit,
  getPhoneNumberInfo,
  getUserPhoneNumbers,
  resetDailyStats,
  setPhoneAuthenticated
};