// src/bots/middlewares/adminCheck.js

const config = require('../../config');
const logger = require('../../utils/logger');

async function isAdmin(userId) {
  logger.info(`Allowed admins: ${JSON.stringify(config.ALLOWED_ADMINS)}`);
  const isAdminUser = config.ALLOWED_ADMINS.includes(userId);
  logger.info(`User ${userId} is admin: ${isAdminUser}`);
  return isAdminUser;
}

module.exports = { isAdmin };
