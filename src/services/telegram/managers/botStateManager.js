// src/services/telegram/botStateManager.js

const { Api } = require('telegram/tl');
const logger = require('../../../utils/logger');
const { delay, safeStringify } = require('../../../utils/helpers');
const OnlineStatusManager = require('./onlineStatusManager');
const sessionManager = require('./sessionManager');

class BotStateManager {
  constructor() {
    this.state = 'offline';
    this.newMessage = true;
    this.typingTimer = null;
    this.offlineTimer = null;
    this.messageBuffer = [];
    this.peer = null;
    this.processingMessage = false;
    this.preOnlineComplete = new Map();
    this.lastMessageTimestamp = new Map();
  }

  async getSession(phoneNumber) {
    let session = await sessionManager.getOrCreateSession(phoneNumber);
    if (!session || !session.connected) {
      logger.warn(`Session for ${phoneNumber} is not connected. Attempting to reauthorize...`);
      session = await sessionManager.reauthorizeSession(phoneNumber);
    }
    return session;
  }

  async setOffline(phoneNumber, userId) {
    this.state = 'offline';
    this.newMessage = true;
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    const session = await this.getSession(phoneNumber);
    await OnlineStatusManager.setOffline(userId, session);
    logger.info(`Bot set to offline for user ${userId}`);
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
      // await delay(Math.random() * 1500 + 1500); // 1.5-3 seconds delay
      // await this.setTyping(phoneNumber, userId);
      this.state = 'typing';
      this.newMessage = false;
    }
    this.preOnlineComplete.set(userId, true);
  }

  async setOnline(phoneNumber, userId) {
    this.state = 'online';
    if (this.newMessage) {
    }
    const session = await this.getSession(phoneNumber);
    await OnlineStatusManager.setOnline(userId, session);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId);
    logger.info(`Bot set to online for user ${userId}`);
  }

  async setTyping(phoneNumber, userId) {
    this.state = 'typing';
    clearTimeout(this.offlineTimer);
    await this.markMessagesAsRead(phoneNumber, userId);
    await this.simulateTyping(phoneNumber, userId);
  }

  resetOfflineTimer(phoneNumber, userId) {
    clearTimeout(this.offlineTimer);
    this.offlineTimer = setTimeout(() => this.setOffline(phoneNumber, userId), Math.random() * 10000 + 20000); // 20-30 seconds
  }

  async markMessagesAsRead(phoneNumber, userId) {
    try {
      const { peer, session } = await this.getCorrectPeer(phoneNumber, userId);
      await session.invoke(new Api.messages.ReadHistory({
        peer: peer,
        maxId: 0
      }));
    } catch (error) {
      logger.error(`Failed to mark messages as read: ${error}`);
    }
  }

  async typing(phoneNumber, userId) {
    try {
      const { peer, session } = await this.getCorrectPeer(phoneNumber, userId);
      await session.invoke(new Api.messages.SetTyping({
        peer: peer,
        action: new Api.SendMessageTypingAction()
      }));
    } catch (error) {
      logger.error(`Error in typing method for ${phoneNumber}, ${userId}: ${error}`);
      if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
        await sessionManager.reauthorizeSession(phoneNumber);
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
      if (this.peer !== null) {
        logger.info('peer is reused');
        return this.peer;
      }
      const session = await this.getSession(phoneNumber);
      logger.info(`Session checked for ${phoneNumber}`);

      const dialogs = await session.getDialogs();
      const dialog = dialogs.find(d => d.entity && d.entity.id.toString() === userId.toString());
      if (dialog) {
        logger.info(`Dialog found: ${safeStringify(dialog.inputEntity)}`);
        this.peer = { peer: dialog.inputEntity, session };
        return this.peer;
      }

      throw new Error('User or dialog not found');
    } catch (error) {
      logger.error(`Error in getCorrectPeer: ${error.message}`);
      if (error.message.includes('AUTH_KEY_UNREGISTERED') || error.message === 'Session is not connected') {
        logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
        await sessionManager.reauthorizeSession(phoneNumber);
        return this.getCorrectPeer(phoneNumber, userId);
      }
      throw error;
    }
  }

  hasNewMessageSince(userId, timestamp) {
    const lastMessageTime = this.lastMessageTimestamp.get(userId) || 0;
    return lastMessageTime > timestamp;
  }

  async handleIncomingMessage(phoneNumber, userId, message) {
    logger.info(`Начало обработки сообщения для пользователя ${userId}: ${message}`);
  
    this.messageBuffer.push(message);
    this.lastMessageTimestamp.set(userId, Date.now());
  
    if (this.processingMessage) {
      logger.info(`Сообщение добавлено в буфер для пользователя ${userId}`);
      return null;
    }
  
    this.processingMessage = true;
    let status = this.state;

    logger.info(`Состояние бота: ${status}`);
  
    if (this.state === 'offline' && OnlineStatusManager.isOnline(userId)) {
      status = 'pre-online';
    }
  
    this.resetOfflineTimer(phoneNumber, userId);
  
    try {
      switch (status) {
        case 'offline':
        case 'pre-online':
          await this.setPreOnline(phoneNumber, userId);
          break;
        case 'online':
        case 'typing':
          await this.markMessagesAsRead(phoneNumber, userId);
          break;
      }
  
      // Ждем завершения setPreOnline
      while (!this.preOnlineComplete.get(userId)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
  
      await this.handleTypingState(phoneNumber, userId);
  
      const combinedMessage = this.messageBuffer.join('\n');
      this.messageBuffer = [];
      this.processingMessage = false;
      
      logger.info(`Завершена обработка сообщения для пользователя ${userId}`);
      return combinedMessage;
    } catch (error) {
      logger.error(`Ошибка при обработке сообщения для пользователя ${userId}: ${error.message}`);
      this.processingMessage = false;
      throw error;
    }
  }

async handleTypingState(phoneNumber, userId) {
  const maxWaitTime = 100000; // максимальное время ожидания в миллисекундах
  const checkInterval = 1000; // интервал проверки в миллисекундах
  let totalWaitTime = 0;

  while (totalWaitTime < maxWaitTime) {
    const userIsTyping = await this.checkUserTyping(phoneNumber, userId);
    if (!userIsTyping) {
      // Если пользователь не печатает, подождем еще немного и проверим снова
      await delay(checkInterval);
      totalWaitTime += checkInterval;
      
      // Если пользователь все еще не печатает, считаем, что он закончил
      if (!await this.checkUserTyping(phoneNumber, userId)) {
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
  await delay(1000);
}
  async checkUserTyping(phoneNumber, userId) {
    try {
      const { peer, session } = await this.getCorrectPeer(phoneNumber, userId);
      const updates = await session.invoke(new Api.messages.GetPeerSettings({
        peer: peer
      }));
      return updates.settings.autorecording;
    } catch (error) {
      logger.error(`Error checking user typing status: ${error}`);
      return false;
    }
  }
}

module.exports = new BotStateManager();