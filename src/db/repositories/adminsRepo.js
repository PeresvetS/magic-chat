// src/db/src/admins.js

const prisma = require('../prisma');
const logger = require('../../utils/logger');

async function getAdminIds() {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        userId: true
      }
    });
    return admins.map(admin => admin.userId);
  } catch (error) {
    logger.error('Error fetching admin IDs:', error);
    throw error;
  }
}

module.exports = {
  getAdminIds
};