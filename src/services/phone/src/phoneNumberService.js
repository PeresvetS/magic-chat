// src/services/phone/phoneNumberService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo, userRepo } = require('../../../db');

function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^\+[1-9]\d{5,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    logger.warn(`Invalid phone number format: ${phoneNumber}`);
    throw new Error(
      'Неверный формат номера телефона. Используйте международный формат, начиная с +',
    );
  }
  logger.info(`Phone number validated successfully: ${phoneNumber}`);
}

async function addPhoneNumber(
  userId,
  phoneNumber,
  platform,
  isPremium = false,
) {
  try {
    validatePhoneNumber(phoneNumber);
    logger.info(
      `Attempting to add ${platform} number ${phoneNumber} for user ${userId}`,
    );

    if (userId) {
      const user = await userRepo.getUserById(userId);
      if (!user) {
        logger.warn(`User with ID ${userId} not found. Proceeding without user association.`);
      }
    }

    const result = await phoneNumberRepo.addPhoneNumber(
      userId,
      phoneNumber,
      platform,
      isPremium,
    );
    logger.info(
      `${platform} number ${phoneNumber} added/updated successfully for user with ID ${userId}`,
    );
    return { ...result, isNew: result.createdAt === result.updatedAt };
  } catch (error) {
    logger.error(
      `Error adding/updating ${platform} number ${phoneNumber} for user with ID ${userId}:`,
      error,
    );
    throw error;
  }
}

async function getUserPhoneNumbers(userId) {
  logger.info(`Getting phone numbers for user ${userId}`);
  try {
    const phoneNumbers = await phoneNumberRepo.getPhoneNumbers(userId);
    logger.info(
      `Retrieved ${phoneNumbers.length} phone numbers for user ${userId}`,
    );
    return phoneNumbers;
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function removePhoneNumber(userId, phoneNumber, platform) {
  logger.info(
    `removePhoneNumber called with userId: ${userId}, phoneNumber: ${phoneNumber}, platform: ${platform}`,
  );

  try {
    if (!phoneNumber) {
      logger.warn('Phone number is undefined or empty');
      throw new Error('Номер телефона не может быть пустым');
    }

    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    await phoneNumberRepo.removePhoneNumber(phoneNumber, platform);
    logger.info(`Removed ${platform} number ${phoneNumber} for user ${userId}`);
  } catch (error) {
    logger.error(
      `Error removing ${platform} number ${phoneNumber} for user ${userId}:`,
      error,
    );
    throw error;
  }
}

async function updatePhoneNumberStatus(phoneNumber, isBanned, banType = null) {
  try {
    await phoneNumberRepo.updatePhoneNumberStatus(
      phoneNumber,
      isBanned,
      banType,
    );
    logger.info(
      `Updated status for phone number ${phoneNumber}: banned=${isBanned}, type=${banType}`,
    );
  } catch (error) {
    logger.error('Error updating phone number status:', error);
    throw error;
  }
}

async function updatePhoneNumberStats(phoneNumber, platform) {
  try {
    const phoneInfo = await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);
    const isNewContact =
      platform === 'telegram'
        ? !phoneInfo.telegramAccount ||
          phoneInfo.telegramAccount.contactsReachedTotal === 0
        : !phoneInfo.whatsappAccount ||
          phoneInfo.whatsappAccount.contactsReachedTotal === 0;

    const updatedPhoneNumber = await phoneNumberRepo.updatePhoneNumberStats(
      phoneNumber,
      isNewContact,
      platform,
    );

    logger.info(
      `Updated ${platform} stats for ${phoneNumber}: +1 message, +${isNewContact ? 1 : 0} contact`,
    );
    return updatedPhoneNumber;
  } catch (error) {
    logger.error(
      `Error updating ${platform} stats for phone number ${phoneNumber}:`,
      error,
    );
    throw error;
  }
}

async function setPhoneNumberLimit(
  phoneNumber,
  platform,
  dailyLimit,
  totalLimit = null,
) {
  try {
    await phoneNumberRepo.setPhoneNumberLimit(
      phoneNumber,
      platform,
      dailyLimit,
      totalLimit,
    );
    logger.info(
      `Updated ${platform} limits for phone number ${phoneNumber}: daily=${dailyLimit}, total=${totalLimit}`,
    );
  } catch (error) {
    logger.error(
      `Error setting ${platform} limits for phone number ${phoneNumber}:`,
      error,
    );
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

async function setPhoneAuthenticated(phoneNumber, platform, isAuthenticated) {
  logger.info(
    `Setting ${platform} authentication status for phone number ${phoneNumber} to ${isAuthenticated}`,
  );
  try {
    validatePhoneNumber(phoneNumber);
    const result = await phoneNumberRepo.setPhoneAuthenticated(
      phoneNumber,
      platform,
      isAuthenticated,
    );
    logger.info(`${platform} authentication status updated for ${phoneNumber}`);
    return result;
  } catch (error) {
    if (error.code === 406 && error.errorMessage === 'AUTH_KEY_DUPLICATED') {
      logger.warn(
        `AUTH_KEY_DUPLICATED for ${phoneNumber}. Attempting to handle gracefully.`,
      );
      // Здесь можно добавить логику для обработки дублирования ключа
      // Например, попытаться использовать существующую сессию или очистить старую
    } else {
      logger.error(
        `Error setting ${platform} authentication status for phone number ${phoneNumber}:`,
        error,
      );
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
  setPhoneAuthenticated,
};
