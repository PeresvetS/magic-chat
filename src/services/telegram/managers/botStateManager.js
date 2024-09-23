// src/services/telegram/botStateManager.js

const { Api } = require('telegram/tl');

const logger = require('../../../utils/logger');
const sessionManager = require('./sessionManager');
const OnlineStatusManager = require('./onlineStatusManager');
const { delay, safeStringify } = require('../../../utils/helpers');
const { RETRY_OPTIONS } = require('../../../config/constants');
const { retryOperation } = require('../../../utils/messageUtils');

class BotStateManager {
  constructor() {
    this.userStates = new Map();
    this.peerCache = new Map();
    this.onlineStatusManager = OnlineStatusManager;
    logger.info('BotStateManager initialized');
  }

  getUserState(userId) {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        state: 'offline',
        newMessage: true,
        typingTimer: null,
        offlineTimer: null,
        messageBuffer: [],
        processingMessage: false,
        preOnlineComplete: false,
        lastMessageTimestamp: 0,
      });
    }
    return this.userStates.get(userId);
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

  async setOffline(phoneNumber, userId) {
    const userState = this.getUserState(userId);
    userState.state = 'offline';
    userState.newMessage = true;
    clearTimeout(userState.typingTimer);
    clearTimeout(userState.offlineTimer);
    const session = await this.getSession(phoneNumber);
    await this.onlineStatusManager.setOffline(userId, session);
    logger.info(`Bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId) {
    const userState = this.getUserState(userId);
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

  async setOnline(phoneNumber, userId) {
    const userState = this.getUserState(userId);
    userState.state = 'online';
    if (userState.newMessage) {
    }
    const session = await this.getSession(phoneNumber);
    await this.onlineStatusManager.setOnline(userId, session);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId);
    logger.info(`Bot set to online for user ${userId}`);
  }

  async setTyping(phoneNumber, userId) {
    const userState = this.getUserState(userId);
    userState.state = 'typing';
    clearTimeout(userState.offlineTimer);
    await this.markMessagesAsRead(phoneNumber, userId);
    await this.simulateTyping(phoneNumber, userId);
  }

  resetOfflineTimer(phoneNumber, userId) {
    const userState = this.getUserState(userId);
    clearTimeout(userState.offlineTimer);
    userState.offlineTimer = setTimeout(
      () => this.setOffline(phoneNumber, userId),
      Math.random() * 10000 + 20000,
    ); // 20-30 seconds
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

  async getCorrectPeer(phoneNumber, userId) {
    try {
      const cacheKey = `${phoneNumber}_${userId}`;

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
      logger.error(`Error in getCorrectPeer: ${error.message}`);
      if (
        error.message.includes('AUTH_KEY_UNREGISTERED') ||
        error.message === 'Session is not connected'
      ) {
        logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
        await sessionManager.reauthorizeSession(phoneNumber);
        return this.getCorrectPeer(phoneNumber, userId);
      }
      throw error;
    }
  }

  hasNewMessageSince(userId, timestamp) {
    const userState = this.getUserState(userId);
    return userState.lastMessageTimestamp > timestamp;
  }

  async handleIncomingMessage(phoneNumber, userId, message) {
    logger.info(
      `Начало обработки сообщения для пользователя ${userId}: ${message}`,
    );

    const userState = this.getUserState(userId);
    logger.debug(`Current userState for ${userId}: ${safeStringify(userState)}`);

    userState.messageBuffer.push(message);
    userState.lastMessageTimestamp = Date.now();

    if (userState.processingMessage) {
      logger.info(`Сообщение добавлено в буфер для пользователя ${userId}`);
      return '';
    }

    userState.processingMessage = true;
    let status = userState.state;

    logger.info(`Состояние бота: ${status}`);

    if (userState.state === 'offline' && this.onlineStatusManager.isOnline(userId)) {
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
      while (!userState.preOnlineComplete) {
        if (Date.now() - startTime > RETRY_OPTIONS.TIMEOUT) {
          logger.warn(
            `Timeout waiting for preOnline to complete for user ${userId}`,
          );
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await this.handleTypingState(phoneNumber, userId);

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

module.exports = new BotStateManager();
