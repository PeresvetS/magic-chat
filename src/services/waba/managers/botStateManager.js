// src/services/waba/managers/botStateManager.js

const logger = require('../../../utils/logger');
const { delay, safeStringify } = require('../../../utils/helpers');
const OnlineStatusManager = require('./onlineStatusManager');
const WABASessionService = require('../services/WABASessionService');
const { RETRY_OPTIONS } = require('../../../config/constants');
const { retryOperation } = require('../../../utils/messageUtils');

class WABABotStateManager {
  constructor() {
    this.state = 'offline';
    this.newMessage = true;
    this.typingTimer = null;
    this.offlineTimer = null;
    this.messageBuffer = [];
    this.processingMessage = false;
    this.preOnlineComplete = new Map();
    this.lastMessageTimestamp = new Map();
  }

  async getSession(phoneNumber) {
    return await WABASessionService.createOrGetSession(phoneNumber);
  }

  async setOffline(phoneNumber, userId) {
    this.state = 'offline';
    this.newMessage = true;
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    const session = await this.getSession(phoneNumber);
    await OnlineStatusManager.setOffline(userId, session);
    logger.info(`WABA Bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId) {
    this.state = 'pre-online';
    this.preOnlineComplete.set(userId, false);
    if (this.newMessage) {
      await delay(Math.random() * 12000 + 3000); // 3-15 seconds delay
      const session = await this.getSession(phoneNumber);
      await OnlineStatusManager.setOnline(userId, session);
      await delay(Math.random() * 5000 + 2000); // 2-7 seconds delay
      await this.markMessagesAsRead(phoneNumber, userId);
      this.state = 'typing';
      this.newMessage = false;
    }
    this.preOnlineComplete.set(userId, true);
  }

  async setOnline(phoneNumber, userId) {
    this.state = 'online';
    const session = await this.getSession(phoneNumber);
    await OnlineStatusManager.setOnline(userId, session);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId);
    logger.info(`WABA Bot set to online for user ${userId}`);
  }

  async setTyping(phoneNumber, userId) {
    this.state = 'typing';
    clearTimeout(this.offlineTimer);
    await this.markMessagesAsRead(phoneNumber, userId);
    await this.simulateTyping(phoneNumber, userId);
  }

  resetOfflineTimer(phoneNumber, userId) {
    clearTimeout(this.offlineTimer);
    this.offlineTimer = setTimeout(
      () => this.setOffline(phoneNumber, userId),
      Math.random() * 10000 + 20000,
    ); // 20-30 seconds
  }

  async markMessagesAsRead(phoneNumber, userId) {
    try {
      const session = await this.getSession(phoneNumber);
      // Implement WABA-specific logic to mark messages as read
      await session.markMessagesAsRead(userId);
    } catch (error) {
      logger.error(`Failed to mark WABA messages as read: ${error}`);
    }
  }

  async simulateTyping(phoneNumber, userId) {
    const typingDuration = Math.random() * 8000 + 4000; // 4-12 seconds
    logger.info(`Simulating WABA typing for ${typingDuration}ms`);
    let elapsedTime = 0;
    const typingInterval = 2000;

    while (elapsedTime < typingDuration) {
      try {
        const session = await this.getSession(phoneNumber);
        await session.sendTypingIndicator(userId);
        if (typingDuration > typingInterval) {
          await delay(typingInterval);
        }
        elapsedTime += typingInterval;
      } catch (error) {
        logger.error(`Error in WABA simulateTyping: ${error}`);
      }
      this.resetOfflineTimer(phoneNumber, userId);
    }
  }

  hasNewMessageSince(userId, timestamp) {
    const lastMessageTime = this.lastMessageTimestamp.get(userId) || 0;
    return lastMessageTime > timestamp;
  }

  async handleIncomingMessage(phoneNumber, userId, message) {
    logger.info(
      `Начало обработки WABA сообщения для пользователя ${userId}: ${message}`,
    );

    this.messageBuffer.push(message);
    this.lastMessageTimestamp.set(userId, Date.now());

    if (this.processingMessage) {
      logger.info(
        `WABA сообщение добавлено в буфер для пользователя ${userId}`,
      );
      return '';
    }

    this.processingMessage = true;
    let status = this.state;

    logger.info(`Состояние WABA бота: ${status}`);

    if (this.state === 'offline' && OnlineStatusManager.isOnline(userId)) {
      status = 'pre-online';
    }

    this.resetOfflineTimer(phoneNumber, userId);

    try {
      switch (status) {
        case 'offline':
        case 'pre-online':
          await retryOperation(() => this.setPreOnline(phoneNumber, userId));
          break;
        case 'online':
        case 'typing':
          await retryOperation(() =>
            this.markMessagesAsRead(phoneNumber, userId),
          );
          break;
      }

      // Ждем завершения setPreOnline с таймаутом
      const startTime = Date.now();
      while (!this.preOnlineComplete.get(userId)) {
        if (Date.now() - startTime > RETRY_OPTIONS.TIMEOUT) {
          logger.warn(
            `Timeout waiting for preOnline to complete for WABA user ${userId}`,
          );
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await this.handleTypingState(phoneNumber, userId);

      const combinedMessage = this.messageBuffer.join('\n');
      this.messageBuffer = [];
      this.processingMessage = false;

      logger.info(
        `Завершена обработка WABA сообщения для пользователя ${userId}`,
      );
      return combinedMessage || '';
    } catch (error) {
      logger.error(
        `Ошибка при обработке WABA сообщения для пользователя ${userId}: ${error.message}`,
      );
      this.processingMessage = false;
      return '';
    } finally {
      this.processingMessage = false;
    }
  }

  async handleTypingState(phoneNumber, userId) {
    const maxWaitTime = RETRY_OPTIONS.MAX_WAITING_TIME;
    const checkInterval = RETRY_OPTIONS.DELAY;
    let totalWaitTime = 0;

    while (totalWaitTime < maxWaitTime) {
      const userIsTyping = await this.checkUserTyping(phoneNumber, userId);
      if (!userIsTyping) {
        await delay(checkInterval);
        totalWaitTime += checkInterval;

        if (!(await this.checkUserTyping(phoneNumber, userId))) {
          break;
        }
      } else {
        totalWaitTime = 0;
      }

      await delay(checkInterval);
      totalWaitTime += checkInterval;
    }

    await delay(RETRY_OPTIONS.DELAY);
  }

  async checkUserTyping(phoneNumber, userId) {
    try {
      const session = await this.getSession(phoneNumber);
      // Implement WABA-specific logic to check if user is typing
      return await session.isUserTyping(userId);
    } catch (error) {
      logger.error(`Error checking WABA user typing status: ${error}`);
      return false;
    }
  }
}

module.exports = new WABABotStateManager();
