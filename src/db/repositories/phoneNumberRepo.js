// src/db/repositories/phoneNumberRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

const DEFAULT_MAX_INACTIVITY_TIME = 60 * 60 * 1000; // 60 minutes in milliseconds

async function getPhoneNumber() {
  try {
    const phoneNumber = await prisma.phoneNumber.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { phoneNumber: true },
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
      create: { phoneNumber, userId },
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
      orderBy: { createdAt: 'desc' },
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
      select: { maxInactivityTime: true },
    });
    return result ? result.maxInactivityTime : DEFAULT_MAX_INACTIVITY_TIME;
  } catch (error) {
    logger.error(
      `Ошибка при получении MAX_INACTIVITY_TIME для номера ${phoneNumber}:`,
      error,
    );
    return DEFAULT_MAX_INACTIVITY_TIME;
  }
}

async function setMaxInactivityTime(phoneNumber, time) {
  try {
    const result = await prisma.phoneNumber.update({
      where: { phoneNumber },
      data: { maxInactivityTime: time },
    });
    if (!result) {
      logger.warn(
        `Попытка обновить MAX_INACTIVITY_TIME для несуществующего номера: ${phoneNumber}`,
      );
    } else {
      logger.info(
        `MAX_INACTIVITY_TIME для номера ${phoneNumber} успешно обновлено: ${time}`,
      );
    }
  } catch (error) {
    logger.error(
      `Ошибка при установке MAX_INACTIVITY_TIME для номера ${phoneNumber}:`,
      error,
    );
    throw error;
  }
}

async function getPhoneNumbers(userId) {
  try {
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { userId },
      include: {
        telegramAccount: true,
        whatsappAccount: true,
      },
    });
    return phoneNumbers.map((pn) => ({
      phoneNumber: pn.phoneNumber,
      isTelegramAuthenticated: pn.telegramAccount?.isAuthenticated || false,
      isWhatsappAuthenticated: pn.whatsappAccount?.isAuthenticated || false,
      whatsAppType: pn.whatsappAccount?.accountType || 'regular',
    }));
  } catch (error) {
    logger.error(`Error getting phone numbers for user ${userId}:`, error);
    throw error;
  }
}

async function disablePhoneNumbers(userId) {
  try {
    await prisma.phoneNumber.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  } catch (error) {
    logger.error('Error disabling phone numbers:', error);
    throw error;
  }
}

async function removePhoneNumber(phoneNumber, platform) {
  try {
    const phoneNumberRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: { telegramAccount: true, whatsappAccount: true, WABAAccount: true },
    });

    if (!phoneNumberRecord) {
      throw new Error(`Номер телефона ${phoneNumber} не найден`);
    }

    // Удаляем связанные записи
    if (platform === 'telegram' || platform === 'all') {
      if (phoneNumberRecord.telegramAccount) {
        await prisma.telegramAccount.delete({
          where: { id: phoneNumberRecord.telegramAccount.id },
        });
      }
      await prisma.telegramSession.deleteMany({
        where: { phoneNumber },
      });
    }

    if (platform === 'whatsapp' || platform === 'all') {
      if (phoneNumberRecord.whatsappAccount) {
        await prisma.whatsappAccount.delete({
          where: { id: phoneNumberRecord.whatsappAccount.id },
        });
      }
      await prisma.whatsappSession.deleteMany({
        where: { phoneNumber },
      });
    }

    if (platform === 'waba' || platform === 'all') {
      if (phoneNumberRecord.WABAAccount) {
        await prisma.wABAAccount.delete({
          where: { id: phoneNumberRecord.WABAAccount.id },
        });
      }
      // Раскомментируйте, если есть таблица wabaSession
      // await prisma.wabaSession.deleteMany({
      //   where: { phoneNumber },
      // });
    }

    // Теперь можно безопасно удалить сам номер телефона
    if (platform === 'all') {
      await prisma.phoneNumber.delete({ where: { phoneNumber } });
    }

    logger.info(`Удален ${platform} аккаунт для номера ${phoneNumber}`);
  } catch (error) {
    logger.error(
      `Ошибка при удалении номера телефона ${phoneNumber} для платформы ${platform}:`,
      error,
    );
    throw error;
  }
}

async function addPhoneNumber(
  userId,
  phoneNumber,
  platform,
  isPremium = false,
  isBanned = false,
) {
  try {
    const phoneNumberRecord = await prisma.phoneNumber.upsert({
      where: { phoneNumber },
      update: { userId },
      create: { userId, phoneNumber },
    });

    switch (platform) {
      case 'telegram':
        await prisma.telegramAccount.upsert({
          where: { phoneNumberId: phoneNumberRecord.id },
          update: { isPremium, isBanned },
          create: {
            phoneNumberId: phoneNumberRecord.id,
            isPremium,
            isBanned,
            isAuthenticated: false,
          },
        });
        break;
      case 'whatsapp':
        await prisma.whatsappAccount.upsert({
          where: { phoneNumberId: phoneNumberRecord.id },
          update: { isBanned },
          create: {
            phoneNumberId: phoneNumberRecord.id,
            isAuthenticated: false,
            accountType: 'regular',
            isBanned,
          },
        });
        break;
      case 'waba':
        await prisma.wABAAccount.upsert({
          where: { phoneNumberId: phoneNumberRecord.id },
          update: {},
          create: {
            phoneNumberId: phoneNumberRecord.id,
            isAuthenticated: false,
          },
        });
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return phoneNumberRecord;
  } catch (error) {
    logger.error(
      `Error adding/updating phone number ${phoneNumber} for user with ID ${userId}:`,
      error,
    );
    throw error;
  }
}

async function updatePhoneNumberStatus(phoneNumber, isBanned, banType = null) {
  try {
    return await prisma.phoneNumber.update({
      where: { phoneNumber },
      data: {
        isBanned,
        banType,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error updating phone number status:', error);
    throw error;
  }
}

async function updatePhoneNumberStats(phoneNumber, isNewContact, platform) {
  try {
    const phoneNumberRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: {
        telegramAccount: true,
        whatsappAccount: true,
        WABAAccount: true,
      },
    });

    if (!phoneNumberRecord) {
      throw new Error(`Phone number ${phoneNumber} not found`);
    }

    const updateData = {
      contactsReachedToday: { increment: isNewContact ? 1 : 0 },
      contactsReachedTotal: { increment: isNewContact ? 1 : 0 },
      messagesSentToday: { increment: 1 },
      messagesSentTotal: { increment: 1 },
    };

    switch (platform) {
      case 'telegram':
        if (phoneNumberRecord.telegramAccount) {
          await prisma.telegramAccount.update({
            where: { id: phoneNumberRecord.telegramAccount.id },
            data: updateData,
          });
        }
        break;
      case 'whatsapp':
        if (phoneNumberRecord.whatsappAccount) {
          await prisma.whatsappAccount.update({
            where: { id: phoneNumberRecord.whatsappAccount.id },
            data: updateData,
          });
        }
        break;
      case 'waba':
        if (phoneNumberRecord.WABAAccount) {
          await prisma.wABAAccount.update({
            where: { id: phoneNumberRecord.WABAAccount.id },
            data: updateData,
          });
        }
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return phoneNumberRecord;
  } catch (error) {
    logger.error('Ошибка обновления статистики номера телефона:', error);
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
    const phoneNumberRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: { telegramAccount: true, whatsappAccount: true },
    });

    if (!phoneNumberRecord) {
      throw new Error(`Phone number ${phoneNumber} not found`);
    }

    if (platform === 'telegram' && phoneNumberRecord.telegramAccount) {
      await prisma.telegramAccount.update({
        where: { id: phoneNumberRecord.telegramAccount.id },
        data: { dailyLimit, totalLimit },
      });
    } else if (platform === 'whatsapp' && phoneNumberRecord.whatsappAccount) {
      await prisma.whatsappAccount.update({
        where: { id: phoneNumberRecord.whatsappAccount.id },
        data: { dailyLimit, totalLimit },
      });
    } else {
      throw new Error(
        `Platform ${platform} account not found for phone number ${phoneNumber}`,
      );
    }

    return phoneNumberRecord;
  } catch (error) {
    logger.error('Error setting phone number limits:', error);
    throw error;
  }
}

async function getPhoneNumberInfo(phoneNumber) {
  try {
    return await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: {
        telegramAccount: true,
        whatsappAccount: true,
        WABAAccount: true,
      },
    });
  } catch (error) {
    logger.error('Error getting phone number info:', error);
    throw error;
  }
}

async function resetDailyStats() {
  try {
    await prisma.telegramAccount.updateMany({
      data: {
        messagesSentToday: 0,
        contactsReachedToday: 0,
      },
    });
    await prisma.whatsappAccount.updateMany({
      data: {
        messagesSentToday: 0,
        contactsReachedToday: 0,
      },
    });
  } catch (error) {
    logger.error('Error resetting daily stats:', error);
    throw error;
  }
}

async function setPhoneAuthenticated(phoneNumber, platform, isAuthenticated) {
  try {
    let phoneNumberRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: { telegramAccount: true, whatsappAccount: true },
    });

    if (!phoneNumberRecord) {
      logger.info(
        `Phone number ${phoneNumber} not found. Creating new record.`,
      );
      phoneNumberRecord = await prisma.phoneNumber.create({
        data: { phoneNumber },
      });
    }

    if (platform === 'telegram') {
      await updateTelegramAccountStatus(phoneNumberRecord, isAuthenticated);
      logger.info(
        `Updated Telegram account status for ${phoneNumber}: isAuthenticated=${isAuthenticated}`,
      );
    } else if (platform === 'whatsapp') {
      await updateWhatsAppAccountStatus(phoneNumberRecord, isAuthenticated);
      logger.info(
        `Updated WhatsApp account status for ${phoneNumber}: isAuthenticated=${isAuthenticated}`,
      );
    } else {
      throw new Error(
        `Unsupported platform ${platform} for phone number ${phoneNumber}`,
      );
    }

    return phoneNumberRecord;
  } catch (error) {
    logger.error(
      `Error setting authentication status for phone number ${phoneNumber}:`,
      error,
    );
    throw error;
  }
}

async function updateTelegramAccountStatus(phoneNumberRecord, isAuthenticated) {
  try {
    if (phoneNumberRecord.telegramAccount) {
      await prisma.telegramAccount.update({
        where: { phoneNumberId: phoneNumberRecord.id },
        data: {
          isAuthenticated,
        },
      });
    } else {
      await prisma.telegramAccount.create({
        data: {
          phoneNumber: { connect: { id: phoneNumberRecord.id } },
          isAuthenticated,
          isPremium: true,
          dailyLimit: 40,
          totalLimit: 40,
        },
      });
    }
  } catch (error) {
    logger.error('Error updating Telegram account status:', error);
  }
}

async function updateWhatsAppAccountStatus(phoneNumberRecord, isAuthenticated) {
  try {
    if (phoneNumberRecord.whatsappAccount) {
      await prisma.whatsappAccount.update({
        where: { id: phoneNumberRecord.whatsappAccount.id },
        data: { isAuthenticated },
      });
    } else {
      await prisma.whatsappAccount.create({
        data: {
          phoneNumber: { connect: { id: phoneNumberRecord.id } },
          isAuthenticated,
          accountType: 'regular',
          dailyLimit: 100,
          totalLimit: 100,
        },
      });
    }
  } catch (error) {
    logger.error(
      `Error updating WhatsApp account status for ${phoneNumberRecord}:`,
      error,
    );
    throw error;
  }
}

async function updatePhoneNumberBanStatus(phoneNumber, banStatus, banExpiresAt = null) {
  try {
    return await prisma.phoneNumber.update({
      where: { phoneNumber },
      data: {
        banStatus,
        banExpiresAt,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error updating phone number ban status:', error);
    throw error;
  }
}

async function getActivePlatformPhoneNumbers(userId, platform) {
  try {
    const now = new Date();
    return await prisma.phoneNumber.findMany({
      where: {
        userId,
        OR: [
          { banStatus: null },
          { banStatus: { notIn: ['USER_DEACTIVATED', 'USER_BANNED', 'PRIVACY_RESTRICTED'] } },
          { banExpiresAt: { lt: now } },
        ],
        [platform === 'telegram' ? 'telegramAccount' : 'whatsappAccount']: {
          isAuthenticated: true,
        },
      },
      select: {
        phoneNumber: true,
        banStatus: true,
        banExpiresAt: true,
      },
    });
  } catch (error) {
    logger.error(`Error getting active ${platform} phone numbers for user ${userId}:`, error);
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
  setPhoneAuthenticated,
  removePhoneNumber,
  updatePhoneNumberBanStatus,
  getActivePlatformPhoneNumbers,
};
