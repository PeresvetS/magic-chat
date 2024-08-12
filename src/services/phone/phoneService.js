// src/services/phone/phoneService.js

const { phoneNumbersTable } = require('../../db');
const logger = require('../../utils/logger');

async function addPhone(userId, phoneNumber) {
  try {
    await telegramSessionService.createSession(phoneNumber);
    await telegramSessionService.authenticateSession(phoneNumber);

    const record = await phoneNumbersTable.create({
      user_id: userId,
      phone_number: phoneNumber,
      is_active: true,
      is_premium: false,
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

async function removePhone(userId, phoneNumber) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `AND({user_id} = '${userId}', {phone_number} = '${phoneNumber}')`
    }).firstPage();

    if (records.length === 0) {
      throw new Error('Phone number not found');
    }

    await phoneNumbersTable.destroy(records[0].id);
    logger.info(`Removed phone ${phoneNumber} for user ${userId}`);
  } catch (error) {
    logger.error('Error removing phone:', error);
    throw error;
  }
}

async function listPhones(userId) {
  try {
    const records = await phoneNumbersTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    return records.map(record => record.fields.phone_number);
  } catch (error) {
    logger.error('Error listing phones:', error);
    throw error;
  }
}

module.exports = {
  addPhone,
  removePhone,
  listPhones
};