// src/services/whatsapp/managers/botStateManager.js

const logger = require('../../../utils/logger');
const { delay, safeStringify } = require('../../../utils/helpers');
const OnlineStatusManager = require('./onlineStatusManager');
const WhatsAppSessionService = require('../services/WhatsAppSessionService');

class BotStateManager {
  constructor() {
    this.state = 'offline';
    this.newMessage = true;
    this.typingTimer = null;
    this.offlineTimer = null;
    this.messageBuffer = [];
    this.processingMessage = false;
  }

  async setOffline(phoneNumber, userId) {
    this.state = 'offline';
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
    await OnlineStatusManager.setOffline(userId, client);
    logger.info(`WhatsApp bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId) {
    this.state = 'pre-online';
    if (this.newMessage === true) {
      await delay(Math.random() * 14000 + 1000); // 1-15 seconds delay
      const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
      await OnlineStatusManager.setOnline(userId, client);
      await delay(Math.random() * 4000 + 1000); // 1-5 seconds delay
      await this.markMessagesAsRead(phoneNumber, userId);
      await this.setTyping(phoneNumber, userId);
      this.newMessage = false;
    }
  }

  async setOnline(phoneNumber, userId) {
    this.state = 'online';
    const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
    await OnlineStatusManager.setOnline(userId, client);
    await this.markMessagesAsRead(phoneNumber, userId);
    this.resetOfflineTimer(phoneNumber, userId);
    logger.info(`WhatsApp bot set to online for user ${userId}`);
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
      const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
      await client.sendSeen(userId);
    } catch (error) {
      logger.error(`Failed to mark WhatsApp messages as read: ${error}`);
    }
  }

  async typing(phoneNumber, userId) {
    const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
    await client.sendPresenceUpdate('composing', userId);
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
        logger.error(`Error in simulateTyping for WhatsApp: ${error}`);
      }
      this.resetOfflineTimer(phoneNumber, userId);
    }
  }

  async handleIncomingMessage(phoneNumber, userId, message) {
    this.messageBuffer.push(message);

    if (this.processingMessage) {
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
      const client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
      // Примечание: WhatsApp Web API может не предоставлять прямой метод для проверки, печатает ли пользователь
      // Возможно, потребуется реализовать собственную логику отслеживания состояния пользователя
      return false; // Заглушка, так как прямой метод может отсутствовать
    } catch (error) {
      logger.error(`Error checking user typing status in WhatsApp: ${error}`);
      return false;
    }
  }
}

module.exports = BotStateManager;