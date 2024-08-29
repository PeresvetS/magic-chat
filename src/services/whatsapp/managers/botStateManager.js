// src/services/whatsapp/managers/botStateManager.js

const logger = require('../../../utils/logger');
const { delay } = require('../../../utils/helpers');
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
    this.hasNewMessage = new Map();
    this.interruptedResponses = new Set();
    this.currentResponsePromise = null;
    this.preOnlineComplete = new Map();
  }

  async getClient(phoneNumber) {
    let client = await WhatsAppSessionService.createOrGetSession(phoneNumber);
    if (!client || !client.isConnected()) {
      logger.warn(`Client for ${phoneNumber} is not connected. Attempting to reconnect...`);
      client = await WhatsAppSessionService.reconnectSession(phoneNumber);
    }
    return client;
  }

  async setOffline(phoneNumber, userId) {
    this.state = 'offline';
    clearTimeout(this.typingTimer);
    clearTimeout(this.offlineTimer);
    const client = await this.getClient(phoneNumber);
    await OnlineStatusManager.setOffline(userId, client);
    logger.info(`WhatsApp bot set to offline for user ${userId}`);
  }

  async setPreOnline(phoneNumber, userId) {
    this.state = 'pre-online';
    this.preOnlineComplete.set(userId, false);
    if (this.newMessage) {
      await delay(Math.random() * 8000 + 2000); // 2-10 seconds delay
      const client = await this.getClient(phoneNumber);
      await OnlineStatusManager.setOnline(userId, client);
      await delay(Math.random() * 5000 + 2000); // 2-7 seconds delay
      await this.markMessagesAsRead(phoneNumber, userId);
      this.state = 'typing';
      this.newMessage = false;
    }
    this.preOnlineComplete.set(userId, true);
  }

  async setOnline(phoneNumber, userId) {
    this.state = 'online';
    const client = await this.getClient(phoneNumber);
    await OnlineStatusManager.setOnline(userId, client);
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
    this.offlineTimer = setTimeout(() => this.setOffline(phoneNumber, userId), Math.random() * 10000 + 20000); // 20-30 seconds
  }

  async markMessagesAsRead(phoneNumber, userId) {
    try {
      const client = await this.getClient(phoneNumber);
      await client.sendSeen(userId);
    } catch (error) {
      logger.error(`Failed to mark WhatsApp messages as read: ${error}`);
    }
  }

  async typing(phoneNumber, userId) {
    const client = await this.getClient(phoneNumber);
    await client.sendPresenceUpdate('composing', userId);
  }

  async simulateTyping(phoneNumber, userId) {
    const typingDuration = Math.random() * 6000 + 2000; // 2-8 seconds
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
        logger.error(`Error in simulateTyping for WhatsApp: ${error}`);
      }
      this.resetOfflineTimer(phoneNumber, userId);
    }
  }

  async handleIncomingMessage(phoneNumber, userId, message) {
    logger.info(`Начало обработки сообщения для пользователя WhatsApp ${userId}: ${message}`);

    this.messageBuffer.push(message);
    this.hasNewMessage.set(userId, true);

    if (this.processingMessage) {
      logger.info(`Сообщение добавлено в буфер для пользователя WhatsApp ${userId}`);
      return null;
    }

    this.processingMessage = true;
    let status = this.state;

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
          break;
      }

      while (!this.preOnlineComplete.get(userId)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await this.handleTypingState(phoneNumber, userId);

      const combinedMessage = this.messageBuffer.join('\n');
      this.messageBuffer = [];
      this.processingMessage = false;
      this.hasNewMessage.set(userId, false);

      logger.info(`Завершена обработка сообщения для пользователя WhatsApp ${userId}`);
      return combinedMessage;
    } catch (error) {
      logger.error(`Ошибка при обработке сообщения для пользователя WhatsApp ${userId}: ${error.message}`);
      this.processingMessage = false;
      throw error;
    }
  }

  interruptCurrentResponse(userId) {
    logger.info(`Прерывание ответа для пользователя WhatsApp ${userId}`);
    this.interruptedResponses.add(userId);
  }

  isResponseInterrupted(userId) {
    return this.interruptedResponses.has(userId);
  }

  setCurrentResponsePromise(promise) {
    this.currentResponsePromise = promise;
  }

  clearInterruption(userId) {
    this.interruptedResponses.delete(userId);
  }

  async handleTypingState(phoneNumber, userId) {
    const maxWaitTime = 100000; // максимальное время ожидания в миллисекундах
    const checkInterval = 1000; // интервал проверки в миллисекундах
    let totalWaitTime = 0;

    while (totalWaitTime < maxWaitTime) {
      const userIsTyping = await this.checkUserTyping(phoneNumber, userId);
      if (!userIsTyping) {
        await delay(checkInterval);
        totalWaitTime += checkInterval;

        if (!await this.checkUserTyping(phoneNumber, userId)) {
          break;
        }
      } else {
        totalWaitTime = 0;
      }

      await delay(checkInterval);
      totalWaitTime += checkInterval;
    }

    await delay(1000);
  }

  checkForNewMessages(userId) {
    return this.hasNewMessage.get(userId) || false;
  }

  async checkUserTyping(phoneNumber, userId) {
    try {
      const client = await this.getClient(phoneNumber);
      
      // Создаем промис, который разрешится, когда придет событие о наборе текста
      const typingPromise = new Promise(resolve => {
        const timeout = setTimeout(() => resolve(false), 5000); // Таймаут 5 секунд
  
        const onTyping = (participant) => {
          if (participant === userId) {
            clearTimeout(timeout);
            client.removeListener('participant-typing', onTyping);
            resolve(true);
          }
        };
  
        client.on('typing', onTyping);
      });
  
      // Ожидаем результат
      const isTyping = await typingPromise;
      
      logger.info(`User ${userId} typing status: ${isTyping}`);
      return isTyping;
    } catch (error) {
      logger.error(`Error checking user typing status in WhatsApp: ${error}`);
      return false;
    }
  }
}

module.exports = new BotStateManager();