// src/services/telegram/botStateManager.js

const { Api } = require('telegram/tl');
const logger = require('../../utils/logger');
const { delay, safeStringify } = require('../../utils/helpers');
const OnlineStatusManager = require('./onlineStatusManager');
const TelegramSessionService = require('./telegramSessionService');
// const rateLimiter = require('./rateLimiter');

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

  async setOffline(session, userId) {
    this.state = 'offline';
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    // await rateLimiter.limit(`setOffline:${userId}`);
    await OnlineStatusManager.setOffline(userId, session);
    logger.info(`Bot set to offline for user ${userId}`);
  }

  async setPreOnline(session, userId) {
    this.state = 'pre-online';
      if (this.newMessage = true) {
      await delay(Math.random() * 15000 + 5000); // 5-20 seconds delay
      await OnlineStatusManager.setOnline(userId, session);
      await delay(Math.random() * 9000 + 1000); // 1-10 seconds delay
      await this.markMessagesAsRead(session, userId);
      await delay(Math.random() * 2000 + 2000); // 2-4 seconds delay
      await this.setTyping(session, userId);
      this.newMessage = false;
    }
  }

  async setOnline(session, userId) {
    this.state = 'online';
    await OnlineStatusManager.setOnline(userId, session);
    await this.markMessagesAsRead(session, userId);
    this.resetOfflineTimer(session, userId);
    logger.info(`Bot set to online for user ${userId}`);
  }

  async setTyping(session, userId) {
    this.state = 'typing';
    clearTimeout(this.offlineTimer);
    await this.markMessagesAsRead(session, userId);
    await this.simulateTyping(session, userId);
  }

  resetOfflineTimer(session, userId) {
    clearTimeout(this.offlineTimer);
    this.offlineTimer = setTimeout(() => this.setOffline(session, userId), Math.random() * 10000 + 20000); // 20-30 seconds
  }

  async markMessagesAsRead(session, userId) {
    try {
    //   await rateLimiter.limit(`markMessagesAsRead:${userId}`);
      const peer = await this.getCorrectPeer(session, userId);
      await session.invoke(new Api.messages.ReadHistory({
        peer: peer,
        maxId: 0
      }));
    } catch (error) {
      logger.error(`Failed to mark messages as read: ${error}`);
    }
  }

  async simulateTyping(session, userId) {
    const typingDuration = Math.random() * 10000 + 5000; // 5-15 seconds
    let elapsedTime = 0;

    while (elapsedTime < typingDuration) {
      try {
        const peer = await this.getCorrectPeer(session, userId);
        await session.invoke(new Api.messages.SetTyping({
          peer: peer,
          action: new Api.SendMessageTypingAction()
        }));

        const typingInterval = Math.random() * 4000 + 3000; // 3-7 seconds
        await delay(typingInterval);
        elapsedTime += typingInterval;
      } catch (error) {
        logger.error(`Error in simulateTyping: ${error}`);
      }
        this.resetOfflineTimer(session, userId);
    }
  }

  async getCorrectPeer(session, userId) {
    try {
      if (this.peer !== null ) {
        logger.info(`peer is reused`);
         return this.peer;
      }
    //   await rateLimiter.limit(`getCorrectPeer:${userId}`);
    //   logger.info(`Getting correct peer for user ${userId}`);
    //   const user = await session.invoke(new Api.users.GetUsers({
    //     id: [new Api.InputUser({
    //       userId: BigInt(userId),
    //       accessHash: BigInt(0)
    //     })]
    //   }));
      
    //   if (user && user.length > 0) {
    //     logger.info(`User found: ${safeStringify(user[0])}`);
    //     return new Api.InputPeerUser({
    //       userId: BigInt(user[0].id),
    //       accessHash: BigInt(user[0].accessHash)
    //     });
    //   }
      
    //   logger.info(`User not found, searching in dialogs`);
    //   await rateLimiter.limit(`getDialogs:${userId}`);
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
        logger.info(`Attempting to reauthorize session for ${session.phoneNumber}`);
        await TelegramSessionService.reauthorizeSession(session.phoneNumber);
        return this.getCorrectPeer(await TelegramSessionService.getSession(session.phoneNumber), userId);
      }
      throw error;
    }
  }

  async handleIncomingMessage(session, userId, message) {
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

    this.resetOfflineTimer(session, userId);

    switch (status) {
      case 'offline':
        await this.setPreOnline(session, userId);
        break;
      case 'pre-online':
        await this.setPreOnline(session, userId);
        break;
      case 'online':
        await this.setTyping(session, userId);
        break;
      case 'typing':
        await this.handleTypingState(session, userId);
        break;
    }
    
    const combinedMessage = this.messageBuffer.join('\n');
    this.messageBuffer = [];
    this.processingMessage = false;
    return combinedMessage;
  }

  async handleTypingState(session, userId) {
    await delay(Math.random() * 2000 + 3000); // Wait 3-5 seconds

    let userIsTyping = await this.checkUserTyping(session, userId);
    while (userIsTyping) {
      await delay(3000); 
      userIsTyping = await this.checkUserTyping(session, userId);
    }

    await delay(Math.random() * 2000 + 3000); // Wait another 3-5 seconds
  }

  async checkUserTyping(session, userId) {
    try {
    //   await rateLimiter.limit(`checkUserTyping:${userId}`);
      const peer = await this.getCorrectPeer(session, userId);
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