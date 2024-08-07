// src/utils/userUtils.js

const { usersTable } = require('../db/airtable');
const logger = require('./logger');

async function getUserId(userIdentifier) {
  try {
    let records;
    if (typeof userIdentifier === 'number') {
      records = await usersTable.select({
        filterByFormula: `{user_id} = '${userIdentifier}'`
      }).firstPage();
    } else {
      records = await usersTable.select({
        filterByFormula: `{username} = '${userIdentifier}'`
      }).firstPage();
    }

    if (records.length === 0) {
      throw new Error('User not found');
    }

    return records[0].fields.user_id;
  } catch (error) {
    logger.error('Error getting user ID:', error);
    throw error;
  }
}

module.exports = { getUserId };