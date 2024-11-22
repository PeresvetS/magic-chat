// src/services/telegram/botStateManager.js

const { Api } = require('telegram/tl');

const logger = require('../../../utils/logger');
const sessionManager = require('./sessionManager');
const OnlineStatusManager = require('./onlineStatusManager');
const { delay, safeStringify } = require('../../../utils/helpers');
const { RETRY_OPTIONS } = require('../../../config/constants');
const { retryOperation } = require('../../../utils/messageUtils');

class BotStateManager {
  constructor(phoneNumber) {
    this.phoneNumber = phoneNumber;
    this.campaignStates = new Map();
    this.peerCache = new Map();
    this.onlineStatusManager = OnlineStatusManager;
    logger.info(`BotStateManager initialized for phone ${phoneNumber}`);
  }

  getUserState(userId, campaignId) {
    if (!this.campaignStates.has(campaignId)) {
      this.campaignStates.set(campaignId, new Map());
    }
    
    const campaignUsers = this.campaignStates.get(campaignId);
    
    if (!campaignUsers.has(userId)) {
      campaignUsers.set(userId, {
        state: 'offline',
        newMessage: true,
        messageBuffer: [],
        isProcessing: false,
        isSendingResponse: false,
        shouldInterruptResponse: false,
        debounceTimer: null,
        lastMessageTimestamp: 0,
        preOnlineComplete: false,
        offlineTimer: null,
      });
    }
    return campaignUsers.get(userId);
  }

  async getSession(phoneNumber) {
    let session = await sessionManager.getOrCreateSession(phoneNumber);
    if (!session || !session.connected) {
      logger.warn(
        `Session for ${phoneNumber} is not connected. Attempting to reauthorize...`,
      );
      session = await sessionManager.reauthorizeSession(phoneNumber);
    }
    return session;
  }

  async setOffline(phoneNumber, userId, campaignId) {
    const userState = this.getUserState(userId, campaignId);
    userState.state = 'offline';
    userState.newMessage = true;
    clearTimeout(userState.typingTimer);
    clearTimeout(userState.offlineTimer);
    const session = await this.getSession(phoneNumber);
    await this.onlineStatusManager.setOffline(userId, session);
    logger.info(`Bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId, campaignId) {
    const userState = this.getUserState(userId, campaignId);
    userState.state = 'pre-online';
    userState.preOnlineComplete = false;
    if (userState.newMessage) {
      await delay(Math.random() * 12000 + 3000); // 3-15 seconds delay
      const session = await this.getSession(phoneNumber);
      await this.onlineStatusManager.setOnline(userId, session);
      await delay(Math.random() * 5000 + 2000); // 2-7 seconds delay
      await this.markMessagesAsRead(phoneNumber, userId);
      userState.state = 'typing';
      userState.newMessage = false;
    }
    userState.preOnlineComplete = true;
  }

  async setOnline(phoneNumber, userId, campaignId) {
    const userState = this.getUserState(userId, campaignId);
    userState.state = 'online';
    if (userState.newMessage) {
    }
    const session = await this.getSession(phoneNumber);
    await this.onlineStatusManager.setOnline(userId, session);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId, campaignId);
    logger.info(`Bot set to online for user ${userId}`);
  }

  async setTyping(phoneNumber, userId, campaignId) {
    const userState = this.getUserState(userId, campaignId);
    userState.state = 'typing';
    clearTimeout(userState.offlineTimer);
    await this.markMessagesAsRead(phoneNumber, userId);
    await this.simulateTyping(phoneNumber, userId);
  }

  resetOfflineTimer(phoneNumber, userId, campaignId) {
    const userState = this.getUserState(userId, campaignId);
    clearTimeout(userState.offlineTimer);
    userState.offlineTimer = setTimeout(
      () => this.setOffline(phoneNumber, userId, campaignId),
      Math.random() * 10000 + 20000,
    );
  }

  async markMessagesAsRead(phoneNumber, userId) {
    try {
      const { peer, session } = await this.getCorrectPeer(phoneNumber, userId);
      await session.invoke(
        new Api.messages.ReadHistory({
          peer,
          maxId: 0,
        }),
      );
    } catch (error) {
      logger.error(`Failed to mark messages as read: ${error}`);
    }
  }

  async typing(phoneNumber, userId) {
    try {
      const { peer, session } = await this.getCorrectPeer(phoneNumber, userId);
      await session.invoke(
        new Api.messages.SetTyping({
          peer,
          action: new Api.SendMessageTypingAction(),
        }),
      );
    } catch (error) {
      logger.error(
        `Error in typing method for ${phoneNumber}, ${userId}: ${error}`,
      );
      if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
        await sessionManager.reauthorizeSession(phoneNumber);
      } else if (error.message.includes('PEER_ID_INVALID')) {
        logger.warn(`Invalid peer ID for ${userId}. Removing from cache.`);
        const cacheKey = `${phoneNumber}_${userId}`;
        this.peerCache.delete(cacheKey);
      }
    }
  }

  async simulateTyping(phoneNumber, userId) {
    const typingDuration = Math.random() * 8000 + 4000; // 4-12 seconds
    logger.info(`Simulating typing with ${6000} for ${typingDuration}ms`);
    let elapsedTime = 0;
    const typingInterval = 2000;

    while (elapsedTime < typingDuration) {
      try {
        await this.typing(phoneNumber, userId);
        if (typingDuration > typingInterval) {
          await delay(typingInterval);
        }
        elapsedTime += typingInterval;
      } catch (error) {
        logger.error(`Error in simulateTyping: ${error}`);
      }
      this.resetOfflineTimer(phoneNumber, userId);
    }
  }

  async getCorrectPeer(phoneNumber, userId, campaignId) {
    try {
      const cacheKey = `${campaignId}_${phoneNumber}_${userId}`;

      if (this.peerCache.has(cacheKey)) {
        logger.info('Peer is reused from cache');
        return this.peerCache.get(cacheKey);
      }

      logger.info(`Creating new peer for ${phoneNumber} and user ${userId}`);

      const session = await this.getSession(phoneNumber);
      logger.info(`Session checked for ${phoneNumber}`);

      let entity;

      // Попробуем получить сущность пользователя через getInputEntity
      try {
        entity = await session.getInputEntity(Number(userId));
      } catch (error) {
        logger.warn(
          `Failed to get entity via getInputEntity for userId ${userId}: ${error.message}`,
        );
      }

      if (!entity) {
        // Если не удалось, попробуем получить из контактов
        try {
          const contacts = await session.getContacts();
          entity = contacts.find(
            (contact) => contact.id.toString() === userId.toString(),
          );
        } catch (error) {
          logger.warn(
            `Failed to get contacts for userId ${userId}: ${error.message}`,
          );
        }
      }

      if (!entity) {
        // Если не удалось, попробуем получить из диалогов
        try {
          const dialogs = await session.getDialogs({});
          entity = dialogs
            .filter((dialog) => dialog.isUser)
            .map((dialog) => dialog.entity)
            .find((entity) => entity.id.toString() === userId.toString());
        } catch (error) {
          logger.warn(
            `Failed to get dialogs for userId ${userId}: ${error.message}`,
          );
        }
      }

      if (entity) {
        const newPeer = { peer: entity, session };
        this.peerCache.set(cacheKey, newPeer);
        return newPeer;
      }
      throw new Error(`Could not find entity for userId ${userId}`);
    } catch (error) {
      logger.error(`Error in getCorrectPeer for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  hasNewMessageSince(userId, timestamp, campaignId) {
    const userState = this.getUserState(userId, campaignId);
    return userState.lastMessageTimestamp > timestamp;
  }

  async handleIncomingMessage(phoneNumber, userId, message, campaignId) {
    logger.info(
      `Начало обработки сообщения для пользователя ${userId} компании ${campaignId}: ${message}`,
    );

    const userState = this.getUserState(userId, campaignId);

    userState.messageBuffer.push(message);

    userState.lastMessageTimestamp = Date.now(); // Update timestamp here

    if (userState.processingMessage) {
      logger.info(`Сообщение добавлено в буфер для пользователя ${userId}`);
      return null;
    }

    logger.info(`Processing message for user ${userId}`);

    userState.processingMessage = true;
    let status = userState.state;

    logger.info(`Состояние бота: ${status}`);

    if (userState.state === 'offline' && this.onlineStatusManager.isOnline(userId)) {
      status = 'pre-online';
    }

    this.resetOfflineTimer(phoneNumber, userId, campaignId);

    try {
      switch (status) {
        case 'offline':
        case 'pre-online':
          await retryOperation(() => this.setPreOnline(phoneNumber, userId, campaignId));
          break;
        case 'online':
        case 'typing':
          await retryOperation(() =>
            this.markMessagesAsRead(phoneNumber, userId),
          );
          break;
      }

      if (userState.preOnlineComplete) {
        await this.handleTypingState(phoneNumber, userId);
      }

      // Ждем завершения setPreOnline с таймаутом
      const startTime = Date.now();
      while (!userState.preOnlineComplete) {
        if (Date.now() - startTime > RETRY_OPTIONS.TIMEOUT) {
          logger.warn(
            `Timeout waiting for preOnline to complete for user ${userId}`,
          );
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      

      if (userState.messageBuffer.length === 0) { // Если буфер пуст, значит сообщение не удалось отправить
        userState.processingMessage = false; // Сброс состояния здесь
        return null;
      }
      const combinedMessage = userState.messageBuffer.join('\n');
      userState.messageBuffer = [];
      userState.processingMessage = false;

      logger.info(`Завершена обработка сообщения для пользователя ${userId}`);
      return combinedMessage || '';
    } catch (error) {
      logger.error(
        `Ошибка при обработке сообщения для пользователя ${userId}: ${error.message}`,
      );
      userState.processingMessage = false;
      return '';
    } finally {
      userState.processingMessage = false;
      logger.info(`Сброс состояния processingMessage для пользователя ${userId}`);
    }
  }

  async handleTypingState(phoneNumber, userId) {
    const maxWaitTime = RETRY_OPTIONS.MAX_WAITING_TIME; // максимальное время ожидания в миллисекундах
    const checkInterval = RETRY_OPTIONS.DELAY; // интервал проверки в миллисекундах
    let totalWaitTime = 0;

    while (totalWaitTime < maxWaitTime) {
      const userIsTyping = await this.checkUserTyping(phoneNumber, userId);
      if (!userIsTyping) {
        // Если пользователь не печатает, подождем еще немного и проверим снова
        await delay(checkInterval);
        totalWaitTime += checkInterval;

        // Если пользователь все еще не печатает, считаем, что он закончил
        if (!(await this.checkUserTyping(phoneNumber, userId))) {
          break;
        }
      } else {
        // Сбрасываем счетчик, если пользователь снова начал печатать
        totalWaitTime = 0;
      }

      await delay(checkInterval);
      totalWaitTime += checkInterval;
    }

    // Добавим небольшую задержку после того, как пользователь закончил печатать
    await delay(RETRY_OPTIONS.DELAY);
  }

  async checkUserTyping(phoneNumber, userId) {
    try {
      const { peer, session } = await this.getCorrectPeer(phoneNumber, userId);
      const updates = await session.invoke(
        new Api.messages.GetPeerSettings({
          peer,
        }),
      );
      return updates.settings.autorecording;
    } catch (error) {
      logger.error(`Error checking user typing status: ${error}`);
      return false;
    }
  }
}

module.exports = BotStateManager;
