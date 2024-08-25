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
  }

  async setOffline(phoneNumber, userId) {
    this.state = 'offline';
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    const session = await sessionManager.getOrCreateSession(phoneNumber);
    await OnlineStatusManager.setOffline(userId, session);
    logger.info(`Bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId) {
    this.state = 'pre-online';
    if (this.newMessage === true) {
      await delay(Math.random() * 14000 + 1000); // 1-15 seconds delay
      const session = await sessionManager.getOrCreateSession(phoneNumber);
      await OnlineStatusManager.setOnline(userId, session);
      await delay(Math.random() * 4000 + 1000); // 1-5 seconds delay
      await this.markMessagesAsRead(phoneNumber, userId);
      await this.setTyping(phoneNumber, userId);
      this.newMessage = false;
    }
  }

  async setOnline(phoneNumber, userId) {
    this.state = 'online';
    const session = await sessionManager.getOrCreateSession(phoneNumber);
    await OnlineStatusManager.setOnline(userId, session);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId);
    logger.info(`Bot set to online for user ${userId}`);
  }

  async setTyping(phoneNumber, userId) {
    this.state = 'typing';
    clearTimeout(this.offlineTimer);
    await this.markMessagesAsRead(phoneNumber, userId);
    await this.typing(phoneNumber, userId);
  }

  resetOfflineTimer(phoneNumber, userId) {
    clearTimeout(this.offlineTimer);
    this.offlineTimer = setTimeout(() => this.setOffline(phoneNumber, userId), Math.random() * 10000 + 20000); // 20-30 seconds
  }

  async markMessagesAsRead(phoneNumber, userId) {
    try {
      const session = await sessionManager.getOrCreateSession(phoneNumber);
      const peer = await this.getCorrectPeer(phoneNumber, userId);
      await session.invoke(new Api.messages.ReadHistory({
        peer: peer,
        maxId: 0
      }));
    } catch (error) {
      logger.error(`Failed to mark messages as read: ${error}`);
    }
  }

  async typing(phoneNumber, userId) {
    const session = await sessionManager.getOrCreateSession(phoneNumber);
    const peer = await this.getCorrectPeer(phoneNumber, userId);
    await session.invoke(new Api.messages.SetTyping({
      peer: peer,
      action: new Api.SendMessageTypingAction()
    }));
  }

  async simulateTyping(phoneNumber, userId) {
    const typingDuration = Math.random() * 6000 + 4000; // 4-10 seconds
    let elapsedTime = 0;
    const typingInterval = 3000; 
    
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
    const session = await sessionManager.getOrCreateSession(phoneNumber);
    logger.info(`Session checked for ${phoneNumber}`);
    
    const dialogs = await session.getDialogs();
    const dialog = dialogs.find(d => d.entity && d.entity.id.toString() === userId.toString());
    if (dialog) {
      logger.info(`Dialog found: ${safeStringify(dialog.inputEntity)}`);
      this.peer = dialog.inputEntity;
      return this.peer;
    }
    
    throw new Error('User or dialog not found');
  } catch (error) {
    logger.error(`Error in getCorrectPeer: ${error.message}`);
    if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
      logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
      await sessionManager.reauthorizeSession(phoneNumber);
      return this.getCorrectPeer(phoneNumber, userId);
    }
    throw error;
  }
}

  async handleIncomingMessage(phoneNumber, userId, message) {
    this.messageBuffer.push(message);
    
    if (this.processingMessage) {
      // Если обработка уже идет, просто добавляем сообщение в буфер
      return null;
    }

    this.processingMessage = true;
    let status = this.state;

    if (this.state === 'offline' && OnlineStatusManager.isOnline(userId)) {
      status = 'pre-online';
    }

    this.resetOfflineTimer(phoneNumber, userId);

    switch (status) {
      case 'offline':
        await this.setPreOnline(phoneNumber, userId);
        break;
      case 'pre-online':
        await this.setPreOnline(phoneNumber, userId);
        break;
      case 'online':
        await this.setTyping(phoneNumber, userId);
        break;
      case 'typing':
        await this.handleTypingState(phoneNumber, userId);
        break;
    }
    
    const combinedMessage = this.messageBuffer.join('\n');
    this.messageBuffer = [];
    this.processingMessage = false;
    return combinedMessage;
  }

  async handleTypingState(phoneNumber, userId) {
    await delay(Math.random() * 5000 + 1000); // 1-5 sec

    await this.simulateTyping(phoneNumber, userId);

    let userIsTyping = await this.checkUserTyping(phoneNumber, userId);
    while (userIsTyping) {
      await delay(3000); 
      userIsTyping = await this.checkUserTyping(phoneNumber, userId);
    }

    await delay(Math.random() * 5000 + 1000); // Wait another 1-4 seconds
  }

  async checkUserTyping(phoneNumber, userId) {
    try {
      const session = await sessionManager.getOrCreateSession(phoneNumber);
      const peer = await this.getCorrectPeer(phoneNumber, userId);
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