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
    return this.userStates.get(userId);
  }

  async handleIncomingMessage(phoneNumber, userId, message) {
    logger.info(`Processing incoming message for user ${userId}: ${message}`);

    const userState = this.getUserState(userId);

    userState.messageBuffer.push(message);
    userState.lastMessageTimestamp = Date.now();
    userState.newMessage = true;

    // Если бот уже отправляет ответ, устанавливаем флаг для прерывания
    if (userState.isSendingResponse) {
      userState.shouldInterruptResponse = true;
    }

    // Сбрасываем таймер дебаунса
    if (userState.debounceTimer) {
      clearTimeout(userState.debounceTimer);
    }

    // Устанавливаем новый таймер дебаунса
    userState.debounceTimer = setTimeout(() => {
      this.processMessageBuffer(phoneNumber, userId);
    }, 1000); // 1 секунда дебаунса
  }

  async processMessageBuffer(phoneNumber, userId) {
    const userState = this.getUserState(userId);

    if (userState.isProcessing) {
      return;
    }

    userState.isProcessing = true;

    const combinedMessage = userState.messageBuffer.join('\n');
    userState.messageBuffer = [];
    userState.newMessage = false;

    try {
      // Обновляем статус
      let status = userState.state;
      if (
        userState.state === 'offline' &&
        this.onlineStatusManager.isOnline(userId)
      ) {
        status = 'pre-online';
      }

      this.resetOfflineTimer(phoneNumber, userId);

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

      // Проверяем, не поступили ли новые сообщения
      if (userState.newMessage) {
        logger.info(
          `New message arrived during processing for user ${userId}. Restarting processing.`,
        );
        userState.isProcessing = false;
        await this.processMessageBuffer(phoneNumber, userId);
        return;
      }

      // Генерируем ответ
      const response = await this.generateResponse(
        phoneNumber,
        userId,
        combinedMessage,
      );

      // Проверяем, не поступили ли новые сообщения
      if (userState.newMessage) {
        logger.info(
          `New message arrived during response generation for user ${userId}. Restarting processing.`,
        );
        userState.isProcessing = false;
        await this.processMessageBuffer(phoneNumber, userId);
        return;
      }

      // Отправляем ответ
      userState.isSendingResponse = true;
      await this.sendResponseWithInterrupt(phoneNumber, userId, response);
    } catch (error) {
      logger.error(
        `Error processing message for user ${userId}: ${error.message}`,
      );
    } finally {
      userState.isProcessing = false;
      userState.isSendingResponse = false;
      userState.shouldInterruptResponse = false;
    }
  }

  async sendResponseWithInterrupt(phoneNumber, userId, response) {
    const userState = this.getUserState(userId);

    // Разбиваем ответ на части
    const sentences = response.split(/\n+/);

    for (const sentence of sentences) {
      // Проверяем, нужно ли прервать отправку
      if (userState.shouldInterruptResponse || userState.newMessage) {
        logger.info(`Interrupting response sending for user ${userId}`);
        userState.isSendingResponse = false;
        await this.processMessageBuffer(phoneNumber, userId);
        return;
      }

      // Отправляем часть ответа
      await this.sendMessage(userId, sentence, phoneNumber);

      // Задержка между отправкой частей
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 1000),
      );
    }

    userState.isSendingResponse = false;
    // После отправки ответа устанавливаем состояние онлайн
    await this.setOnline(phoneNumber, userId);
  }

  // ... Остальные методы без изменений, не включая require внутри функций

  async sendMessage(userId, message, phoneNumber) {
    // Используем sendMessage из messageSender, передавая BotStateManager
    const { sendMessage } = require('../../messaging/src/messageSender');
    await sendMessage(
      userId,
      message,
      phoneNumber,
      'telegram',
      this, // Передаем BotStateManager для использования getCorrectPeer
    );
  }

  async generateResponse(phoneNumber, userId, message) {
    // Используем processMessage из messageProcessor
    const { processMessage } = require('../../messaging/src/messageProcessor');
    const { leadService } = require('../../leads');
    const { getActiveCampaignForPhoneNumber } =
      require('../../campaign').campaignsMailingService;

    const activeCampaign = await getActiveCampaignForPhoneNumber(phoneNumber);
    if (!activeCampaign || !activeCampaign.prompt) {
      logger.warn(
        `No active campaign or prompt for ${phoneNumber}. Message ignored.`,
      );
      return '';
    }

    const lead = await this.getOrCreateLeadIdByChatId(
      userId,
      'telegram',
      activeCampaign.userId,
    );

    const response = await processMessage(
      lead,
      userId,
      message,
      phoneNumber,
      activeCampaign,
    );

    return response || '';
  }

  async getOrCreateLeadIdByChatId(chatId, platform, userId) {
    const { leadService } = require('../../leads');
    const lead = await this.getLeadIdByChatId(chatId, platform);
    if (!lead) {
      logger.info(`Lead not found for ${platform} chat ID ${chatId}`);
      const newLead = await leadService.createLead(platform, chatId, userId);
      return newLead;
    }
    return lead;
  }

  async getLeadIdByChatId(chatId, platform) {
    const { leadService } = require('../../leads');
    try {
      let lead;
      switch (platform) {
        case 'telegram':
          lead = await leadService.getLeadByTelegramChatId(chatId);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      return lead || null;
    } catch (error) {
      logger.error('Error getting lead ID by chat ID:', error);
      return null;
    }
  }
}

module.exports = new BotStateManager();