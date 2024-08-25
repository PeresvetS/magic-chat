// src/services/phone/phoneNumberService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, userRepo } = require('../../../db');

function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^\+[1-9]\d{5,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    logger.warn(`Invalid phone number format: ${phoneNumber}`);
    throw new Error('Неверный формат номера телефона. Используйте международный формат, начиная с +');
  }
  logger.info(`Phone number validated successfully: ${phoneNumber}`);
}

async function addPhoneNumber(userId, phoneNumber, isPremium = false) {
  try {
    validatePhoneNumber(phoneNumber);
    logger.info(`Attempting to add phone number ${phoneNumber} for user ${userId}`);

    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const result = await phoneNumberRepo.addPhoneNumber(userId, phoneNumber, isPremium);
    logger.info(`Phone number ${phoneNumber} added/updated successfully for user with ID ${userId}`);
    return { ...result, isNew: result.createdAt === result.updatedAt };
  } catch (error) {
    logger.error(`Error adding/updating phone number ${phoneNumber} for user with ID ${userId}:`, error);
    throw error;
  }
}

async function getUserPhoneNumbers(userId) {
  logger.info(`Getting phone numbers for user ${userId}`);
  try {
    return await phoneNumberRepo.getPhoneNumbers(userId);
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function removePhoneNumber(userId, phoneNumber) {
  logger.info(`removePhoneNumber called with userId: ${userId}, phoneNumber: ${phoneNumber}`);

  try {
    if (!phoneNumber) {
      logger.warn('Phone number is undefined or empty');
      throw new Error('Номер телефона не может быть пустым');
    }
    
    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    await phoneNumberRepo.disablePhoneNumbers(userId);
    logger.info(`Removed phone number ${phoneNumber} for user ${userId}`);
  } catch (error) {
    logger.error(`Error removing phone number ${phoneNumber} for user ${userId}:`, error);
    throw error;
  }
}

async function updatePhoneNumberStatus(phoneNumber, isBanned, banType = null) {
  try {
    await phoneNumberRepo.updatePhoneNumberStatus(phoneNumber, isBanned, banType);
    logger.info(`Updated status for phone number ${phoneNumber}: banned=${isBanned}, type=${banType}`);
  } catch (error) {
    logger.error('Error updating phone number status:', error);
    throw error;
  }
}

async function updatePhoneNumberStats(phoneNumber, userId) {
  try {
    const phoneInfo = await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);
    const isNewContact = !phoneInfo || phoneInfo.contactsReachedTotal === 0;

    const updatedPhoneNumber = await phoneNumberRepo.updatePhoneNumberStats(phoneNumber, userId, isNewContact);
    
    logger.info(`Updated stats for ${phoneNumber}: +1 message, +${isNewContact ? 1 : 0} contact`);
    return updatedPhoneNumber;
  } catch (error) {
    logger.error(`Error updating phone number stats for ${phoneNumber}:`, error);
    throw error;
  }
}

async function setPhoneNumberLimit(phoneNumber, dailyLimit, totalLimit = null) {
  try {
    await phoneNumberRepo.setPhoneNumberLimit(phoneNumber, dailyLimit, totalLimit);
    logger.info(`Updated limits for phone number ${phoneNumber}: daily=${dailyLimit}, total=${totalLimit}`);
  } catch (error) {
    logger.error('Error setting phone number limits:', error);
    throw error;
  }
}

async function getPhoneNumberInfo(phoneNumber) {
  try {
    return await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);
  } catch (error) {
    logger.error('Error getting phone number info:', error);
    throw error;
  }
}

async function resetDailyStats() {
  try {
    await phoneNumberRepo.resetDailyStats();
    logger.info('Daily stats reset for all phone numbers');
  } catch (error) {
    logger.error('Error resetting daily stats:', error);
    throw error;
  }
}

async function setPhoneAuthenticated(phoneNumber, isAuthenticated) {
  logger.info(`Setting authentication status for phone number ${phoneNumber} to ${isAuthenticated}`);
  try {
    await phoneNumberRepo.setPhoneAuthenticated(phoneNumber, isAuthenticated);
    logger.info(`Authentication status updated for ${phoneNumber}`);
  } catch (error) {
    if (error.code === 406 && error.errorMessage === 'AUTH_KEY_DUPLICATED') {
      logger.warn(`AUTH_KEY_DUPLICATED for ${phoneNumber}. Attempting to handle gracefully.`);
      // Здесь можно добавить логику для обработки дублирования ключа
      // Например, попытаться использовать существующую сессию или очистить старую
    } else {
      logger.error(`Error setting authentication status for phone number ${phoneNumber}:`, error);
      throw error;
    }
  }
}

module.exports = {
  addPhoneNumber,
  removePhoneNumber,
  updatePhoneNumberStatus,
  updatePhoneNumberStats,
  setPhoneNumberLimit,
  getPhoneNumberInfo,
  getUserPhoneNumbers,
  resetDailyStats,
  setPhoneAuthenticated
};