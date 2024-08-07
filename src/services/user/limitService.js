// src/services/user/limitService.js

const { userLimitsTable, parsedUsersTable, phoneNumbersTable, parsingCampaignsTable } = require('../../db/airtable');
const logger = require('../../utils/logger');
const { getUserId } = require('../../utils/userUtils');

async function setLimit(userIdentifier, limitType, limitValue) {
  try {
    const userId = await getUserId(userIdentifier);
    const records = await userLimitsTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    if (records.length === 0) {
      await userLimitsTable.create([
        {
          fields: {
            user_id: userId,
            [`${limitType}_limit`]: limitValue
          }
        }
      ]);
    } else {
      await userLimitsTable.update([
        {
          id: records[0].id,
          fields: { [`${limitType}_limit`]: limitValue }
        }
      ]);
    }

    logger.info(`Set ${limitType} limit to ${limitValue} for user ${userId}`);
  } catch (error) {
    logger.error('Error setting limit:', error);
    throw error;
  }
}

async function getLimits(userIdentifier) {
  try {
    const userId = await getUserId(userIdentifier);
    const records = await userLimitsTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    if (records.length === 0) {
      return {
        parsing: null,
        phones: null,
        campaigns: null,
        contacts: null,
        leads: null
      };
    }

    const limits = records[0].fields;
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

async function checkLimit(userId, limitType) {
  try {
    const records = await userLimitsTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();

    if (records.length === 0) {
      return true; // No limits set, allow action
    }

    const limits = records[0].fields;
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
  const records = await parsedUsersTable.select({
    filterByFormula: `{user_id} = '${userId}'`
  }).firstPage();
  return records.length;
}

async function getActivePhoneNumbersCount(userId) {
  const records = await phoneNumbersTable.select({
    filterByFormula: `AND({user_id} = '${userId}', {is_active} = TRUE())`
  }).firstPage();
  return records.length;
}

async function getCampaignsCount(userId) {
  const records = await parsingCampaignsTable.select({
    filterByFormula: `{user_id} = '${userId}'`
  }).firstPage();
  return records.length;
}

async function getProcessedContactsCount(userId) {
  const records = await parsedUsersTable.select({
    filterByFormula: `AND({user_id} = '${userId}', {is_processed} = TRUE())`
  }).firstPage();
  return records.length;
}

async function getSuccessfulLeadsCount(userId) {
  const records = await parsedUsersTable.select({
    filterByFormula: `AND({user_id} = '${userId}', {processing_status} = 'lead')`
  }).firstPage();
  return records.length;
}

module.exports = {
  setLimit,
  getLimits,
  checkLimit
};