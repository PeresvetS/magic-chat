// src/services/user/src/userPhoneService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, userRepo } = require('../../../db');

async function getPhoneNumbers(userId) {
  try {
    return await phoneNumberRepo.getPhoneNumbers(userId);
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function disablePhoneNumbers(userIdentifier) {
  try {
    const user = await userRepo.getUserById(userIdentifier);
    if (!user) {
      throw new Error(`User with ID ${userIdentifier} not found`);
    }
    await phoneNumberRepo.disablePhoneNumbers(user.id);
    logger.info(`Disabled phone numbers for user ${user.id}`);
  } catch (error) {
    logger.error('Error disabling phone numbers:', error);
    throw error;
  }
}

module.exports = {
  getPhoneNumbers,
  disablePhoneNumbers
};