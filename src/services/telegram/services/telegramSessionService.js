// src/services/telegram/telegramSessionService.js

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { Api } = require('telegram/tl');

const config = require('../../../config');
const logger = require('../../../utils/logger');

const sessionManager = require('../managers/sessionManager');
const { telegramSessionsRepo } = require('../../../db');
const authTelegramService = require('./authTelegramService');
const telegramMailingService = require('./telegramMailingService');
const { processIncomingMessage } = require('../../messaging').handleMessageService;
const { LRUCache } = require('lru-cache');
const BotStateManager = require('../managers/botStateManager');

class TelegramSessionService {
  constructor() {
    this.sessions = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60 * 24,
    });
    this.eventHandlers = new Map();
    this.botStateManagers = new Map();
    this.connectionCheckInterval = null;
    this.authorizationCheckInterval = null;
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 5000;
  }

  async initialize() {
    try {
      logger.info('Initializing TelegramSessionService...');
      
      // Инициализируем все сессии
      await this.initializeSessions();
      
      // Запускаем проверки только после инициализации
      this.startConnectionCheck();
      this.startAuthorizationCheck();
      
      logger.info('TelegramSessionService initialized successfully');
    } catch (error) {
      logger.error('Error initializing TelegramSessionService:', error);
      throw error;
    }
  }

  startConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    this.connectionCheckInterval = setInterval(async () => {
      for (const [phoneNumber, client] of this.sessions.entries()) {
        try {
          if (!client.connected) {
            logger.warn(`Connection lost for ${phoneNumber}, attempting to reconnect...`);
            await this.maintainConnection(client, phoneNumber);
          }
        } catch (error) {
          logger.error(`Error checking connection for ${phoneNumber}:`, error);
        }
      }
    }, 30000); // Проверка каждые 30 секунд
  }

  startAuthorizationCheck() {
    if (this.authorizationCheckInterval) {
      clearInterval(this.authorizationCheckInterval);
    }

    this.authorizationCheckInterval = setInterval(async () => {
      for (const [phoneNumber, client] of this.sessions.entries()) {
        try {
          const isAuthorized = await authTelegramService.checkAuthorization(client);
          if (!isAuthorized) {
            logger.warn(`Authorization expired for ${phoneNumber}, attempting to reauthorize...`);
            await this.reauthorizeSession(phoneNumber, this.MAX_RETRIES, this.RETRY_DELAY);
          }
        } catch (error) {
          logger.error(`Error checking authorization for ${phoneNumber}:`, error);
        }
      }
    }, 300000); // Проверка каждые 5 минут
  }

  async disconnect() {
    try {
      logger.info('Disconnecting TelegramSessionService...');
      
      // Очищаем интервалы
      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval);
      }
      if (this.authorizationCheckInterval) {
        clearInterval(this.authorizationCheckInterval);
      }

      // Отключаем все сессии
      await this.disconnectAllSessions();
      
      // Очищаем все коллекции
      this.sessions.clear();
      this.eventHandlers.clear();
      this.botStateManagers.clear();
      
      logger.info('TelegramSessionService disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting TelegramSessionService:', error);
      throw error;
    }
  }

  getBotStateManager(phoneNumber, campaignId) {
    const key = `${phoneNumber}_${campaignId}`;
    if (!this.botStateManagers.has(key)) {
      this.botStateManagers.set(key, new BotStateManager(phoneNumber));
    }
    return this.botStateManagers.get(key);
  }

  async maintainConnection(client, phoneNumber) {
    let reconnectAttempts = 0;

    const reconnect = async () => {
      try {
        if (!client.connected) {
          logger.info('Attempting to reconnect to Telegram...');
          await client.connect();
          logger.info('Successfully reconnected to Telegram');
          reconnectAttempts = 0; // Сбрасываем счетчик после успешного подключения

          this.addEventHandlers(client, phoneNumber); // Добавляем обработчики событий
        }
      } catch (error) {
        reconnectAttempts++;
        logger.error(
          `Failed to reconnect (attempt ${reconnectAttempts}):`,
          error,
        );

        if (reconnectAttempts >= this.MAX_RETRIES) {
          logger.error(
            'Max reconnect attempts reached. Manual intervention required.',
          );
          // Здесь можно добавить код для уведомления администратора
          return;
        }

        setTimeout(reconnect, this.RETRY_DELAY);
      }
    };

    client.on('disconnect', reconnect);

    // Периодическая проверка соединения
    setInterval(async () => {
      try {
        if (client.connected) {
          await client.invoke(new Api.Ping({ ping_id: BigInt(1) }));
        } else {
          reconnect();
        }
      } catch (error) {
        logger.warn('Error during periodic connection check:', error);
        reconnect();
      }
    }, 30000); // Проверка каждые 30 секунд
  }

  async initializeSessions() {
    try {
      const allSessions = await telegramSessionsRepo.getAllSessions();
      for (const sessionData of allSessions) {
        await this.createSession(sessionData.phoneNumber);
      }
      logger.info('All Telegram sessions initialized');
    } catch (error) {
      logger.error('Error initializing sessions:', error);
      // Не выбрасываем ошибку, чтобы приложение могло продолжить работу
    }
  }

  async reauthorizeSession(phoneNumber, maxRetries, retryDelay) {
    const session = await this.getOrCreateSession(phoneNumber);
    return authTelegramService.reauthorizeSession(phoneNumber, maxRetries, retryDelay, session);
  }

  async saveSession(phoneNumber, sessionString) {
    try {
      await telegramSessionsRepo.saveSession(phoneNumber, sessionString);
      const client = this.sessions.get(phoneNumber);
      if (client) {
        client.session.load(sessionString);
      }
      logger.info(`Session saved for ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error saving session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getOrCreateSession(phoneNumber) {
    try {
      // Проверяем кэш
      if (this.sessions.has(phoneNumber)) {
        const session = this.sessions.get(phoneNumber);
        if (!session.connected) {
          await session.connect();
        }
        return session;
      }

      // Если сессии нет в кэше, пытаемся загрузить из базы данных
      const sessionData = await telegramSessionsRepo.getSession(phoneNumber);
      if (sessionData) {
        const stringSession = new StringSession(sessionData.session);
        const client = new TelegramClient(
          stringSession,
          parseInt(config.API_ID),
          config.API_HASH,
          { connectionRetries: 5 }
        );
        await client.connect();
        this.sessions.set(phoneNumber, client);
        this.addEventHandlers(client, phoneNumber); // Добавляем обработчики событий здесь
        return client;
      }

      // Если сессии нет и в базе данных, создаем новую
      const session = await this.createSession(phoneNumber);
        this.sessions.set(phoneNumber, session);
        return session;
    } catch (error) {
      logger.error(`Error getting or creating session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async createSession(phoneNumber) {
    const sessionData = await telegramSessionsRepo.getSession(phoneNumber);
    const stringSession = new StringSession(sessionData?.session || '');

    const client = new TelegramClient(
      stringSession,
      parseInt(config.API_ID),
      config.API_HASH,
      {
        connectionRetries: 3,
        deviceModel: 'MacBookPro16,1',
        systemVersion: 'macOS 11.2.3',
        appVersion: '5.3.1',
        langCode: 'ru',
      }
    );

    await client.connect();
    logger.info(`Connected client for ${phoneNumber}`);

    this.addEventHandlers(client, phoneNumber); // Добавляем обработчики событий

    const sessionString = client.session.save();
    await this.saveSession(phoneNumber, sessionString);

    this.maintainConnection(client, phoneNumber);

    return client;
  }

  async authenticateSession(phoneNumber, bot, chatId) {
    const client = await this.getOrCreateSession(phoneNumber);
    const newClient = await authTelegramService.authenticateSession(phoneNumber, bot, chatId, client);
    const sessionString = newClient.session.save();
    await telegramSessionsRepo.saveSession(phoneNumber, sessionString);
    await bot.sendMessage(chatId, 'Успешная авторизация');
    this.addEventHandlers(newClient, phoneNumber); // Добавляем обработчики событий
    return newClient;
  }

  async generateQRCode(phoneNumber, bot, chatId) {
    try {
      const client = await this.getOrCreateSession(phoneNumber);
      const newClient = await authTelegramService.generateQRCode(phoneNumber, bot, chatId, client);
      if (newClient) {
        const sessionString = client.session.save();
        await this.saveSession(phoneNumber, sessionString);
        logger.info(`Session saved for ${phoneNumber}`);
      } else {
        logger.warn(
          `No client found for ${phoneNumber}. Unable to save session.`,
        );
      }
      await bot.sendMessage(chatId, 'Успешная авторизация');
    } catch (error) {
      logger.error(`Error generating QR code for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getSession(phoneNumber) {
    if (this.sessions.has(phoneNumber)) {
      const client = this.sessions.get(phoneNumber);
      if (!client.connected) {
        try {
          await client.connect();
          logger.info(`Reconnected client for ${phoneNumber}`);
        } catch (error) {
          logger.error(`Error reconnecting client for ${phoneNumber}:`, error);
          return await this.createSession(phoneNumber);
        }
      }
      return client;
    }
    logger.info(`Creating new session for ${phoneNumber}`);
    return await this.createSession(phoneNumber);
  }

  async checkSession(phoneNumber) {
    return this.getOrCreateSession(phoneNumber);
  }

  async disconnectSession(phoneNumber) {
    if (this.sessions.has(phoneNumber)) {
      const client = this.sessions.get(phoneNumber);
      try {
        // Remove event handlers
        if (this.eventHandlers.has(phoneNumber)) {
          const handler = this.eventHandlers.get(phoneNumber);
          client.removeEventHandler(handler);
          this.eventHandlers.delete(phoneNumber);
        }

        // Disconnect the client
        await client.disconnect();

        // Clear the update loop
        if (client._updateLoop) {
          clearInterval(client._updateLoop);
          client._updateLoop = null;
        }

        // Remove the session from the cache
        this.sessions.delete(phoneNumber);

        // Remove the session from the database
        await telegramSessionsRepo.deleteSession(phoneNumber);

        logger.info(`Session for ${phoneNumber} has been fully disconnected and removed.`);
      } catch (error) {
        logger.error(`Error disconnecting session for ${phoneNumber}:`, error);
      }
    } else {
      logger.info(`No active session found for ${phoneNumber}`);
    }
  }

  async getDialogs(phoneNumber) {
    const session = await this.getOrCreateSession(phoneNumber);
    return session.getDialogs();
  }

  async disconnectAllSessions() {
    for (const [phoneNumber, client] of this.sessions.entries()) {
      try {
        await client.disconnect();
        logger.info(`Disconnected session for ${phoneNumber}`);
      } catch (error) {
        logger.error(`Error disconnecting session for ${phoneNumber}:`, error);
      }
    }
    this.sessions.clear();
  }

  async findUserByPhoneNumber(phoneNumber, client) {
    if (!client) {
      client = await this.getOrCreateSession(phoneNumber);
  }
  return telegramMailingService.findUserByPhoneNumber(phoneNumber, client);
  }

  async sendTelegramMessage(recipientPhoneNumber, senderPhoneNumber, campaignId, message) {
    const client = await this.getOrCreateSession(senderPhoneNumber);
    return telegramMailingService.sendTelegramMessage(recipientPhoneNumber, senderPhoneNumber, campaignId, message, client);
  }

  async addEventHandlers(client, phoneNumber, campaignId) {
    const botStateManager = this.getBotStateManager(phoneNumber, campaignId);
    const key = `${phoneNumber}_${campaignId}`;

    if (this.eventHandlers.has(key)) {
      client.removeEventHandler(this.eventHandlers.get(key));
    }

    const handler = async (event) => {
      logger.info(`Received new message event for ${phoneNumber} campaign ${campaignId}`);
      try {
        await processIncomingMessage(phoneNumber, event, 'telegram', client, campaignId);
      } catch (error) {
        logger.error(`Error processing message for ${phoneNumber}, campaign ${campaignId}:`, error);

        if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
          logger.info(
            `Attempting to reauthorize Telegram session for ${senderPhoneNumber}`,
          );
          await this.reauthorizeSession(senderPhoneNumber);
          logger.info(
            `Telegram session reauthorized for ${senderPhoneNumber}, retrying message send`,
          );
          return sendMessage(senderId, message, senderPhoneNumber, platform);
        }
      }
    };

    client.addEventHandler(handler, new NewMessage({}));
    this.eventHandlers.set(key, handler);
  }

}

module.exports = TelegramSessionService;
