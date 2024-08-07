// src/middleware/adminCheck.js

const { getAdminIds } = require('../db/airtable');
const logger = require('../utils/logger');

let ALLOWED_ADMINS = [];

async function updateAdminList() {
  try {
    ALLOWED_ADMINS = await getAdminIds();
    logger.info('Admin list updated successfully');
  } catch (error) {
    logger.error('Error updating admin list:', error);
  }
}

async function isAdmin(msg) {
  if (ALLOWED_ADMINS.length === 0) {
    await updateAdminList();
  }
  return ALLOWED_ADMINS.includes(msg.from.id);
}

module.exports = { isAdmin };