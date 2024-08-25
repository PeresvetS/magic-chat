// src/db/repositories/phoneNumberRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

const DEFAULT_MAX_INACTIVITY_TIME = 60 * 60 * 1000; // 60 minutes in milliseconds

async function getPhoneNumber() {
  try {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { phoneNumber: true }
    });
    return phoneNumber ? phoneNumber.phoneNumber : null;
  } catch (error) {
    logger.error('Ошибка при получении номера телефона:', error);
    throw error;
  }
}

async function setPhoneNumber(phoneNumber, userId = null) {
  try {
    const result = await prisma.phoneNumber.upsert({
      where: { phoneNumber },
      update: { updatedAt: new Date() },
      create: { phoneNumber, userId }
    });
    logger.info(`Номер телефона ${phoneNumber} успешно сохранен.`);
    return result;
  } catch (error) {
    logger.error('Ошибка при установке номера телефона:', error);
    throw error;
  }
}

async function getPhoneNumberHistory() {
  try {
    return await prisma.phoneNumber.findMany({
      select: { phoneNumber: true, userId: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    logger.error('Ошибка при получении истории номеров телефона:', error);
    throw error;
  }
}

async function getMaxInactivityTime(phoneNumber) {
  try {
    const result = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      select: { maxInactivityTime: true }
    });
    return result ? result.maxInactivityTime : DEFAULT_MAX_INACTIVITY_TIME;
  } catch (error) {
    logger.error(`Ошибка при получении MAX_INACTIVITY_TIME для номера ${phoneNumber}:`, error);
    return DEFAULT_MAX_INACTIVITY_TIME;
  }
}

async function setMaxInactivityTime(phoneNumber, time) {
  try {
    const result = await prisma.phoneNumber.update({
      where: { phoneNumber },
      data: { maxInactivityTime: time }
    });
    if (!result) {
      logger.warn(`Попытка обновить MAX_INACTIVITY_TIME для несуществующего номера: ${phoneNumber}`);
    } else {
      logger.info(`MAX_INACTIVITY_TIME для номера ${phoneNumber} успешно обновлено: ${time}`);
    }
  } catch (error) {
    logger.error(`Ошибка при установке MAX_INACTIVITY_TIME для номера ${phoneNumber}:`, error);
    throw error;
  }
}

async function getPhoneNumbers(userId) {
  try {
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { userId: userId },
      select: { phoneNumber: true }
    });
    return phoneNumbers.map(row => row.phoneNumber);
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function disablePhoneNumbers(userId) {
  try {
    await prisma.phoneNumber.updateMany({
      where: { userId: userId },
      data: { isActive: false }
    });
  } catch (error) {
    logger.error('Error disabling phone numbers:', error);
    throw error;
  }
}

async function addPhoneNumber(userId, phoneNumber, isPremium = false) {
  try {
    return await prisma.phoneNumber.upsert({
      where: { phoneNumber: phoneNumber },
      update: { 
        userId: userId, 
        isPremium: isPremium, 
        updatedAt: new Date() 
      },
      create: {
        userId: userId,
        phoneNumber: phoneNumber,
        isPremium: isPremium,
        dailyLimit: 40,
        isAuthenticated: false
      }
    });
  } catch (error) {
    logger.error(`Error adding/updating phone number ${phoneNumber} for user with ID ${userId}:`, error);
    throw error;
  }
}

async function updatePhoneNumberStatus(phoneNumber, isBanned, banType = null) {
  try {
    return await prisma.phoneNumber.update({
      where: { phoneNumber: phoneNumber },
      data: { 
        isBanned: isBanned, 
        banType: banType, 
        updatedAt: new Date() 
      }
    });
  } catch (error) {
    logger.error('Error updating phone number status:', error);
    throw error;
  }
}

async function updatePhoneNumberStats(phoneNumber, userId, isNewContact) {
  try {
    return await prisma.$transaction(async (prisma) => {
      if (isNewContact) {
        await prisma.phoneNumberContact.create({
          data: {
            phoneNumber: phoneNumber,
            userId: userId.toString()
          }
        });
      }

      return await prisma.phoneNumber.update({
        where: { phoneNumber: phoneNumber },
        data: {
          messagesSentToday: { increment: 1 },
          messagesSentTotal: { increment: 1 },
          contactsReachedToday: { increment: isNewContact ? 1 : 0 },
          contactsReachedTotal: { increment: isNewContact ? 1 : 0 },
          updatedAt: new Date()
        }
      });
    });
  } catch (error) {
    logger.error(`Error updating phone number stats for ${phoneNumber}:`, error);
    throw error;
  }
}

async function setPhoneNumberLimit(phoneNumber, dailyLimit, totalLimit = null) {
  try {
    return await prisma.phoneNumber.update({
      where: { phoneNumber: phoneNumber },
      data: { 
        dailyLimit: dailyLimit, 
        totalLimit: totalLimit, 
        updatedAt: new Date() 
      }
    });
  } catch (error) {
    logger.error('Error setting phone number limits:', error);
    throw error;
  }
}

async function getPhoneNumberInfo(phoneNumber) {
  try {
    return await prisma.phoneNumber.findUnique({
      where: { phoneNumber: phoneNumber }
    });
  } catch (error) {
    logger.error('Error getting phone number info:', error);
    throw error;
  }
}

async function resetDailyStats() {
  try {
    await prisma.phoneNumber.updateMany({
      data: { 
        messagesSentToday: 0, 
        contactsReachedToday: 0, 
        updatedAt: new Date() 
      }
    });
  } catch (error) {
    logger.error('Error resetting daily stats:', error);
    throw error;
  }
}

async function setPhoneAuthenticated(phoneNumber, isAuthenticated) {
  try {
    return await prisma.phoneNumber.update({
      where: { phoneNumber: phoneNumber },
      data: { 
        isAuthenticated: isAuthenticated, 
        updatedAt: new Date() 
      }
    });
  } catch (error) {
    logger.error(`Error setting authentication status for phone number ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  getPhoneNumber,
  setPhoneNumber,
  getPhoneNumberHistory,
  getMaxInactivityTime,
  setMaxInactivityTime,
  getPhoneNumbers,
  disablePhoneNumbers,
  addPhoneNumber,
  updatePhoneNumberStatus,
  updatePhoneNumberStats,
  setPhoneNumberLimit,
  getPhoneNumberInfo,
  resetDailyStats,
  setPhoneAuthenticated
};