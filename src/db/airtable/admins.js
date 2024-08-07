// src/db/airtable/admins.js

const { adminsTable } = require('./config');
const logger = require('../../utils/logger');

async function getAdminIds() {
  try {
    const records = await adminsTable.select().firstPage();
    return records.map(record => record.get('admin_id'));
  } catch (error) {
    logger.error('Error fetching admin IDs:', error);
    throw error;
  }
}

module.exports = {
  getAdminIds
};