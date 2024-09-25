const whapi = require('@api/whapi');
const logger = require('../../../utils/logger');
const { delay } = require('../../../utils/helpers');
const OnlineStatusManager = require('./onlineStatusManager');
const WhatsAppSessionService = require('../services/WhatsAppSessionService');
const { RETRY_OPTIONS } = require('../../../config/constants');
const config = require('../../../config');

class BotStateManager {
  constructor() {
    this.state = 'offline';
    this.newMessage = true;
    this.typingTimer = null;
    this.offlineTimer = null;
    this.messageBuffer = [];
    this.processingMessage = false;
    this.preOnlineComplete = new Map();
    this.lastMessageTimestamp = new Map();
    whapi.auth(config.WHAPI_TOKEN);
  }

  async getClient(phoneNumber) {
    return await WhatsAppSessionService.createOrGetSession(phoneNumber);
  }

  async setOffline(phoneNumber, userId) {
    this.state = 'offline';
    this.newMessage = true;
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    await OnlineStatusManager.setOffline(userId);
    logger.info(`WhatsApp bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId) {
    this.state = 'pre-online';
    this.preOnlineComplete.set(userId, false);
    if (this.newMessage) {
      await delay(Math.random() * 12000 + 3000); // 3-15 seconds delay
      await OnlineStatusManager.setOnline(userId);
      await delay(Math.random() * 5000 + 2000); // 2-7 seconds delay
      await this.markMessagesAsRead(phoneNumber, userId);
      this.state = 'typing';
      this.newMessage = false;
    }
    this.preOnlineComplete.set(userId, true);
  }

  async setOnline(phoneNumber, userId) {
    this.state = 'online';
    await OnlineStatusManager.setOnline(userId);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId);
    logger.info(`WhatsApp bot set to online for user ${userId}`);
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
      await whapi.markMessageAsRead(userId);
    } catch (error) {
      logger.error(`Failed to mark WhatsApp messages as read: ${error}`);
    }
  }

  async simulateTyping(phoneNumber, userId) {
    const typingDuration = Math.random() * 6000 + 2000; // 2-8 seconds
    logger.info(`Simulating typing for ${typingDuration}ms`);
    let elapsedTime = 0;
    const typingInterval = 2000;

    while (elapsedTime < typingDuration) {
      try {
        await whapi.sendTypingOrRecordingPresence(userId, { presence: 'typing', delay: 5 });
        if (typingDuration > typingInterval) {
          await delay(typingInterval);
        }
        elapsedTime += typingInterval;
      } catch (error) {
        logger.error(`Error in simulateTyping for WhatsApp: ${error}`);
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
      `Начало обработки сообщения для пользователя WhatsApp ${userId}: ${message}`,
    );

    this.messageBuffer.push(message);
    this.lastMessageTimestamp.set(userId, Date.now());

    if (this.processingMessage) {
      logger.info(
        `Сообщение добавлено в буфер для пользователя WhatsApp ${userId}`,
      );
      return '';
    }

    this.processingMessage = true;
    let status = this.state;

    logger.info(`Состояние бота WhatsApp: ${status}`);

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
            `Timeout waiting for preOnline to complete for WhatsApp user ${userId}`,
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
        `Завершена обработка сообщения для пользователя WhatsApp ${userId}`,
      );
      return combinedMessage || '';
    } catch (error) {
      logger.error(
        `Ошибка при обработке сообщения для пользователя WhatsApp ${userId}: ${error.message}`,
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
      const { data } = await whapi.getPresence(userId);
      const isTyping = data.presence === 'composing';
      logger.info(`User ${userId} typing status: ${isTyping}`);
      return isTyping;
    } catch (error) {
      logger.error(`Error checking user typing status in WhatsApp: ${error}`);
      return false;
    }
  }
}

module.exports = new BotStateManager();
