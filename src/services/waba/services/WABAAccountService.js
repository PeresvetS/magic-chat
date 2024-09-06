// src/services/waba/services/WABAAccountService.js

const logger = require('../../../utils/logger');
const { prisma } = require('../../../db/utils/prisma');
const WABASessionService = require('./WABASessionService');

class WABAAccountService {
  async createAccount(phoneNumber, businessProfileId) {
    logger.info(`Creating WABA account for ${phoneNumber}`);
    try {
      const account = await prisma.wABAAccount.create({
        data: {
          phoneNumber: { connect: { phoneNumber } },
          businessProfileId,
          isAuthenticated: false,
        },
      });
      logger.info(`WABA account created for ${phoneNumber}`);
      return account;
    } catch (error) {
      logger.error(`Error creating WABA account for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getAccount(phoneNumber) {
    logger.info(`Getting WABA account for ${phoneNumber}`);
    try {
      const account = await prisma.wABAAccount.findUnique({
        where: { phoneNumber: { phoneNumber } },
      });
      return account;
    } catch (error) {
      logger.error(`Error getting WABA account for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async updateAccount(phoneNumber, updateData) {
    logger.info(`Updating WABA account for ${phoneNumber}`);
    try {
      const account = await prisma.wABAAccount.update({
        where: { phoneNumber: { phoneNumber } },
        data: updateData,
      });
      logger.info(`WABA account updated for ${phoneNumber}`);
      return account;
    } catch (error) {
      logger.error(`Error updating WABA account for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async deleteAccount(phoneNumber) {
    logger.info(`Deleting WABA account for ${phoneNumber}`);
    try {
      await prisma.wABAAccount.delete({
        where: { phoneNumber: { phoneNumber } },
      });
      await WABASessionService.disconnectSession(phoneNumber);
      logger.info(`WABA account deleted for ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error deleting WABA account for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async setAuthenticated(phoneNumber, isAuthenticated) {
    logger.info(
      `Setting WABA account authentication status for ${phoneNumber} to ${isAuthenticated}`,
    );
    try {
      const account = await this.updateAccount(phoneNumber, {
        isAuthenticated,
      });
      if (isAuthenticated) {
        await WABASessionService.createOrGetSession(phoneNumber);
      } else {
        await WABASessionService.disconnectSession(phoneNumber);
      }
      return account;
    } catch (error) {
      logger.error(
        `Error setting WABA account authentication status for ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  async updateMessageStats(phoneNumber, newContacts = 0, messagesSent = 1) {
    logger.info(`Updating message stats for WABA account ${phoneNumber}`);
    try {
      const account = await this.updateAccount(phoneNumber, {
        contactsReachedToday: { increment: newContacts },
        contactsReachedTotal: { increment: newContacts },
        messagesSentToday: { increment: messagesSent },
        messagesSentTotal: { increment: messagesSent },
      });
      return account;
    } catch (error) {
      logger.error(
        `Error updating message stats for WABA account ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  async resetDailyStats() {
    logger.info('Resetting daily stats for all WABA accounts');
    try {
      await prisma.wABAAccount.updateMany({
        data: {
          contactsReachedToday: 0,
          messagesSentToday: 0,
        },
      });
      logger.info('Daily stats reset for all WABA accounts');
    } catch (error) {
      logger.error('Error resetting daily stats for WABA accounts:', error);
      throw error;
    }
  }
}

module.exports = new WABAAccountService();
