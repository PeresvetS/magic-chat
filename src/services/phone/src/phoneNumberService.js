// src/services/phone/phoneNumberService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo } = require('../../../db');
const { getUserById } = require('../../../db').userRepo;
const { validatePhoneNumber } = require('../../../utils/phoneHelpers');

async function addPhoneNumber(
  userId,
  phoneNumber,
  platform,
  isPremium = false,
  isBanned = false,
) {
  try {
    validatePhoneNumber(phoneNumber);
    logger.info(
      `Attempting to add ${platform} number ${phoneNumber} for user ${userId}`,
    );

    if (userId) {
      const user = await getUserById(userId);
      if (!user) {
        logger.warn(
          `User with ID ${userId} not found. Proceeding without user association.`,
        );
      }
    }

    const result = await phoneNumberRepo.addPhoneNumber(
      userId,
      phoneNumber,
      platform,
      isPremium,
      isBanned,
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

    const user = await getUserById(userId);
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

async function checkDailyPhoneNumberLimit(phoneNumber, platform) {
  try {
    const phoneNumberInfo =
      await phoneNumberRepo.getPhoneNumberInfo(phoneNumber);

    if (!phoneNumberInfo) {
      return true; // Если записи нет, считаем что лимит не достигнут
    }

    switch (platform) {
      case 'telegram':
        if (!phoneNumberInfo.telegramAccount) {
          throw new Error(
            `No Telegram account found for phone number ${phoneNumber}`,
          );
        }
        return (
          phoneNumberInfo.telegramAccount.contactsReachedToday <
          phoneNumberInfo.telegramAccount.dailyLimit
        );
      case 'whatsapp':
        if (!phoneNumberInfo.whatsappAccount) {
          throw new Error(
            `No WhatsApp account found for phone number ${phoneNumber}`,
          );
        }
        return (
          phoneNumberInfo.whatsappAccount.contactsReachedToday <
          phoneNumberInfo.whatsappAccount.dailyLimit
        );
      case 'waba':
        if (!phoneNumberInfo.WABAAccount) {
          throw new Error(
            `No WABA account found for phone number ${phoneNumber}`,
          );
        }
        return (
          phoneNumberInfo.WABAAccount.contactsReachedToday <
          phoneNumberInfo.WABAAccount.dailyLimit
        );
      default:
        throw new Error(`Invalid platform: ${platform}`);
    }
  } catch (error) {
    logger.error(`Error checking daily limit for ${platform}:`, error);
    throw error;
  }
}

async function updateMessagePhoneNumberCount(
  phoneSenderNumber,
  isNewContact,
  platform,
) {
  try {
    await phoneNumberRepo.updatePhoneNumberStats(
      phoneSenderNumber,
      isNewContact,
      platform,
    );
  } catch (error) {
    logger.error(
      `Ошибка обновления счетчика сообщений для ${platform}:`,
      error,
    );
    throw error;
  }
}

async function updatePhoneNumberBanStatus(phoneNumber, banStatus, banExpiresAt = null) {
  try {
    await phoneNumberRepo.updatePhoneNumberBanStatus(phoneNumber, banStatus, banExpiresAt);
    logger.info(`Updated ban status for ${phoneNumber}: ${banStatus}, expires: ${banExpiresAt}`);
  } catch (error) {
    logger.error('Error updating phone number ban status:', error);
    throw error;
  }
}

async function getActivePlatformPhoneNumbers(userId, platform) {
  try {
    return await phoneNumberRepo.getActivePlatformPhoneNumbers(userId, platform);
  } catch (error) {
    logger.error(`Error getting active ${platform} phone numbers for user ${userId}:`, error);
    throw error;
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
  checkDailyPhoneNumberLimit,
  updateMessagePhoneNumberCount,
  updatePhoneNumberBanStatus,
  getActivePlatformPhoneNumbers,
};
