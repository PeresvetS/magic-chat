// src/services/waba/managers/onlineStatusManager.js

const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

class WABAOnlineStatusManager {
  constructor() {
    this.onlineUsers = new Map();
    this.timeoutDuration = 20000; // 20 seconds
    logger.info('WABAOnlineStatusManager initialized');
  }

  async setOnline(userId, session) {
    try {
      logger.info(`Setting online status for WABA user ${userId}`);
      if (this.onlineUsers.has(userId)) {
        clearTimeout(this.onlineUsers.get(userId));
        logger.info(`Cleared existing timeout for WABA user ${userId}`);
      }
      this.onlineUsers.set(
        userId,
        setTimeout(
          () => this.setOffline(userId, session),
          this.timeoutDuration,
        ),
      );

      // Implement WABA-specific logic to set online status
      const result = await session.setOnlineStatus(userId, true);

      logger.info(
        `Online status set for WABA user ${userId}, result: ${safeStringify(result)}`,
      );

      return result;
    } catch (error) {
      logger.error(
        `Error setting online status for WABA user ${userId}:`,
        safeStringify(error),
      );
      throw error;
    }
  }

  async setOffline(userId, session) {
    try {
      logger.info(`Setting offline status for WABA user ${userId}`);
      this.onlineUsers.delete(userId);

      // Implement WABA-specific logic to set offline status
      await session.setOnlineStatus(userId, false);

      logger.info(`Offline status set for WABA user ${userId}`);
    } catch (error) {
      logger.error(
        `Error setting offline status for WABA user ${userId}:`,
        safeStringify(error),
      );
    }
  }

  isOnline(userId) {
    const isOnline = this.onlineUsers.has(userId);
    logger.info(`Checking online status for WABA user ${userId}: ${isOnline}`);
    return isOnline;
  }
}

module.exports = new WABAOnlineStatusManager();
