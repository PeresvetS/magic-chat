// src/services/user/userPhoneService.js

const { phoneNumbersTable } = require('../../../db');
const logger = require('../../../utils/logger');
const { getUserId } = require('../../../utils/userUtils');


async function getPhoneNumbers(userId) {
    const records = await phoneNumbersTable.select({
      filterByFormula: `{user_id} = '${userId}'`
    }).firstPage();
  
    return records.map(record => ({
      number: record.fields.phone_number,
      isActive: record.fields.is_active
    }));
  }


  async function disablePhoneNumbers(userIdentifier) {
    try {
      const userId = await getUserId(userIdentifier);
      const records = await phoneNumbersTable.select({
        filterByFormula: `{user_id} = '${userId}'`
      }).firstPage();
  
      for (const record of records) {
        await phoneNumbersTable.update([
          {
            id: record.id,
            fields: { is_active: false }
          }
        ]);
      }
  
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


