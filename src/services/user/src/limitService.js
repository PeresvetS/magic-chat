// src/services/user/src/limitService.js

const db = require('../../../db/postgres/config');
const logger = require('../../../utils/logger');
const { ensureUserExistsById } = require('../../../utils/userUtils');

async function setLimit(userId, limitType, limitValue) {
  try {
    await ensureUserExistsById(userId);
    const query = `
      INSERT INTO user_limits (user_id, ${limitType}_limit)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET ${limitType}_limit = $2
    `;
    await db.query(query, [userId, limitValue]);
    logger.info(`Set ${limitType} limit to ${limitValue} for user ${userId}`);
  } catch (error) {
    logger.error('Error setting limit:', error);
    throw error;
  }
}

async function getLimits(userId) {
  try {
    await ensureUserExistsById(userId);
    const query = 'SELECT * FROM user_limits WHERE user_id = $1';
    const { rows } = await db.query(query, [userId]);

    if (rows.length === 0) {
      return {
        parsing: null,
        phones: null,
        campaigns: null,
        contacts: null,
        leads: null
      };
    }

    const limits = rows[0];
    return {
      parsing: limits.parsing_limit,
      phones: limits.phones_limit,
      campaigns: limits.campaigns_limit,
      contacts: limits.contacts_limit,
      leads: limits.leads_limit
    };
  } catch (error) {
    logger.error('Error getting limits:', error);
    throw error;
  }
}

async function checkLimit(userIdentifier, limitType) {
  try {
    const userId = await ensureUserExistsById(userIdentifier);
    const query = 'SELECT * FROM user_limits WHERE user_id = $1';
    const { rows } = await db.query(query, [userId]);

    if (rows.length === 0) {
      return true; // No limits set, allow action
    }

    const limits = rows[0];
    const limitValue = limits[`${limitType}_limit`];

    if (limitValue === null || limitValue === undefined) {
      return true; // No specific limit set, allow action
    }

    const currentUsage = await getCurrentUsage(userId, limitType);
    return currentUsage < limitValue;
  } catch (error) {
    logger.error('Error checking limit:', error);
    throw error;
  }
}

async function getCurrentUsage(userId, limitType) {
  switch (limitType) {
    case 'parsing':
      return getParsedUsersCount(userId);
    case 'phones':
      return getActivePhoneNumbersCount(userId);
    case 'campaigns':
      return getCampaignsCount(userId);
    case 'contacts':
      return getProcessedContactsCount(userId);
    case 'leads':
      return getSuccessfulLeadsCount(userId);
    default:
      throw new Error(`Unknown limit type: ${limitType}`);
  }
}

async function getParsedUsersCount(userId) {
  const query = 'SELECT COUNT(*) FROM parsed_users WHERE user_id = $1';
  const { rows } = await db.query(query, [userId]);
  return parseInt(rows[0].count);
}

async function getActivePhoneNumbersCount(userId) {
  const query = 'SELECT COUNT(*) FROM phone_numbers WHERE user_id = $1 AND is_active = TRUE';
  const { rows } = await db.query(query, [userId]);
  return parseInt(rows[0].count);
}

async function getCampaignsCount(userId) {
  const query = 'SELECT COUNT(*) FROM parsing_campaigns WHERE user_id = $1';
  const { rows } = await db.query(query, [userId]);
  return parseInt(rows[0].count);
}

async function getProcessedContactsCount(userId) {
  const query = 'SELECT COUNT(*) FROM parsed_users WHERE user_id = $1 AND is_processed = TRUE';
  const { rows } = await db.query(query, [userId]);
  return parseInt(rows[0].count);
}

async function getSuccessfulLeadsCount(userId) {
  const query = 'SELECT COUNT(*) FROM parsed_users WHERE user_id = $1 AND processing_status = \'lead\'';
  const { rows } = await db.query(query, [userId]);
  return parseInt(rows[0].count);
}

module.exports = {
  setLimit,
  getLimits,
  checkLimit
};