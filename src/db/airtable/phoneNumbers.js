// src/db/airtable/phoneNumbers.js

const { phoneTable } = require('./config');
const logger = require('../../utils/logger');

async function getPhoneNumber() {
  try {
    const records = await phoneTable.select({
      maxRecords: 1,
      sort: [{ field: 'created_at', direction: 'desc' }]
    }).firstPage();
    
    if (records.length > 0) {
      return records[0].get('phone_number');
    }
    return null;
  } catch (error) {
    logger.error('Ошибка при получении номера телефона:', error);
    throw error;
  }
}

async function setPhoneNumber(number, userId) {
  try {
    await phoneTable.create([
      {
        fields: {
          phone_number: number,
          user_id: userId,
          created_at: new Date().toISOString(),
          max_inactivity_time: DEFAULT_MAX_INACTIVITY_TIME
        }
      }
    ]);
  } catch (error) {
    logger.error('Ошибка при установке номера телефона:', error);
    throw error;
  }
}

async function getPhoneNumberHistory() {
  try {
    const records = await phoneTable.select({
      sort: [{ field: 'created_at', direction: 'desc' }]
    }).firstPage();
    
    return records.map(record => ({
      phoneNumber: record.get('phone_number'),
      userId: record.get('user_id'),
      createdAt: record.get('created_at')
    }));
  } catch (error) {
    logger.error('Ошибка при получении истории номеров телефона:', error);
    throw error;
  }
}

async function getMaxInactivityTime(phoneNumber) {
  try {
    const records = await phoneTable.select({
      filterByFormula: `{phone_number} = '${phoneNumber}'`
    }).firstPage();
    
    if (records.length > 0) {
      return records[0].get('max_inactivity_time') || DEFAULT_MAX_INACTIVITY_TIME;
    }
    return DEFAULT_MAX_INACTIVITY_TIME;
  } catch (error) {
    logger.error(`Ошибка при получении MAX_INACTIVITY_TIME для номера ${phoneNumber}:`, error);
    return DEFAULT_MAX_INACTIVITY_TIME;
  }
}

async function setMaxInactivityTime(phoneNumber, time) {
  try {
    const records = await phoneTable.select({
      filterByFormula: `{phone_number} = '${phoneNumber}'`
    }).firstPage();
    
    if (records.length > 0) {
      await phoneTable.update([
        {
          id: records[0].id,
          fields: { max_inactivity_time: time }
        }
      ]);
      logger.info(`MAX_INACTIVITY_TIME для номера ${phoneNumber} успешно обновлено: ${time}`);
    } else {
      logger.warn(`Попытка обновить MAX_INACTIVITY_TIME для несуществующего номера: ${phoneNumber}`);
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