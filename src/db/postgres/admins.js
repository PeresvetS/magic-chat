// src/db/postgres/admins.js

const db = require('./config');
const logger = require('../../utils/logger');

async function getAdminIds() {
  try {
    const query = 'SELECT admin_id FROM admins';
    const result = await db.query(query);
    return result.rows.map(row => row.admin_id);
  } catch (error) {
    logger.error('Error fetching admin IDs:', error);
    throw error;
  }
}

module.exports = {
  getAdminIds
};