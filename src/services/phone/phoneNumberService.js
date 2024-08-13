// src/services/phone/phoneNumberService.js

const { phoneNumbersTable } = require('../../db');
const logger = require('../../utils/logger');
const telegramSessionService = require('../telegram');

async function addPhoneNumber(userId, phoneNumber, isPremium = false) {
  try {
    const record = await phoneNumbersTable.create({
      user_id: userId,
      phone_number: phoneNumber,
      is_premium: isPremium,
      daily_limit: 40,
      total_limit: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    logger.info(`Added phone number ${phoneNumber} for user ${userId}`);
    return record;
  } catch (error) {
    logger.error('Error adding phone number:', error);
    throw error;
  }
}

async function getUserPhoneNumbers(userId) {
    try {
      const records = await phoneNumbersTable.select({
        filterByFormula: `{user_id} = '${userId}'`
      }).all();
      return records.map(record => record.fields.phone_number);
    } catch (error) {
      logger.error('Error getting user phone numbers:', error);
      throw error;
    }
  }

async function removePhoneNumber(userId, phoneNumber) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `AND({user_id} = '${userId}', {phone_number} = '${phoneNumber}')`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('Phone number not found');
    }

    await phoneNumbersTable.destroy(records[0].id);
    logger.info(`Removed phone number ${phoneNumber} for user ${userId}`);
  } catch (error) {
    logger.error('Error removing phone number:', error);
    throw error;
  }
}

async function updatePhoneNumberStatus(phoneNumber, isBanned, banType = null) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `{phone_number} = '${phoneNumber}'`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('Phone number not found');
    }

    await phoneNumbersTable.update(records[0].id, {
      is_banned: isBanned,
      ban_type: banType,
      updated_at: new Date().toISOString()
    });

    logger.info(`Updated status for phone number ${phoneNumber}: banned=${isBanned}, type=${banType}`);
  } catch (error) {
    logger.error('Error updating phone number status:', error);
    throw error;
  }
}

async function updatePhoneNumberStats(phoneNumber, messagesSent, contactsReached) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `{phone_number} = '${phoneNumber}'`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('Phone number not found');
    }

    const currentRecord = records[0];
    await phoneNumbersTable.update(currentRecord.id, {
      messages_sent_today: (currentRecord.fields.messages_sent_today || 0) + messagesSent,
      messages_sent_total: (currentRecord.fields.messages_sent_total || 0) + messagesSent,
      contacts_reached_today: (currentRecord.fields.contacts_reached_today || 0) + contactsReached,
      contacts_reached_total: (currentRecord.fields.contacts_reached_total || 0) + contactsReached,
      updated_at: new Date().toISOString()
    });

    logger.info(`Updated stats for phone number ${phoneNumber}`);
  } catch (error) {
    logger.error('Error updating phone number stats:', error);
    throw error;
  }
}

async function setPhoneNumberLimit(phoneNumber, dailyLimit, totalLimit = null) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `{phone_number} = '${phoneNumber}'`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('Phone number not found');
    }

    await phoneNumbersTable.update(records[0].id, {
      daily_limit: dailyLimit,
      total_limit: totalLimit,
      updated_at: new Date().toISOString()
    });

    logger.info(`Updated limits for phone number ${phoneNumber}: daily=${dailyLimit}, total=${totalLimit}`);
  } catch (error) {
    logger.error('Error setting phone number limits:', error);
    throw error;
  }
}

async function getPhoneNumberInfo(phoneNumber) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `{phone_number} = '${phoneNumber}'`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('Phone number not found');
    }

    return records[0].fields;
  } catch (error) {
    logger.error('Error getting phone number info:', error);
    throw error;
  }
}

async function resetDailyStats() {
    try {
      const allRecords = await phoneNumbersTable.select().all();
      const updates = allRecords.map(record => ({
        id: record.id,
        fields: {
          messages_sent_today: 0,
          contacts_reached_today: 0,
          updated_at: new Date().toISOString()
        }
      }));
  
      await phoneNumbersTable.update(updates);
      logger.info('Daily stats reset for all phone numbers');
    } catch (error) {
      logger.error('Error resetting daily stats:', error);
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
  resetDailyStats
};