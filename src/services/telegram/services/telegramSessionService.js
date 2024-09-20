// src/services/telegram/telegramSessionService.js

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { Api } = require('telegram/tl');

const mainClientService = require('./telegramMainSessionService');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const { getUserByTgId } = require('../../user').userService;
const { setPhoneAuthenticated, addPhoneNumber, getPhoneNumberInfo } =
  require('../../phone').phoneNumberService;
const { processIncomingMessage } =
  require('../../messaging').handleMessageService;
const sessionManager = require('../managers/sessionManager');
const { telegramSessionsRepo } = require('../../../db');
const TelegramMainSessionService = require('./telegramMainSessionService');
const {
  checkAuthorization,
  connectWithRetry,
  reauthorizeSession,
  get2FAPasswordFromUser,
  getAuthCodeFromUser,
  generateQRCode,
} = require('./authTelegramService');

class TelegramSessionService {
  constructor() {
    this.sessions = new Map();
    this.startConnectionCheck();
    this.startAuthorizationCheck();
    this.connectionCheckInterval = null;
    this.authorizationCheckInterval = null;
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 5000;
  }

  async maintainConnection(client) {
    let reconnectAttempts = 0;

    const reconnect = async () => {
      try {
        if (!client.connected) {
          logger.info('Attempting to reconnect to Telegram...');
          await client.connect();
          logger.info('Successfully reconnected to Telegram');
          reconnectAttempts = 0; // Сбрасываем счетчик после успешного подключения
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
      await mainClientService.initializeMainClient();
      logger.info('Main Telegram session initialized');

      const allSessions = await telegramSessionsRepo.getAllSessions();
      for (const sessionData of allSessions) {
        if (sessionData.phoneNumber !== config.MAIN_TG_PHONE_NUMBER) {
          await this.createSession(sessionData.phoneNumber);
        }
      }
      logger.info('All Telegram sessions initialized');
    } catch (error) {
      logger.error('Error initializing sessions:', error);
      // Не выбрасываем ошибку, чтобы приложение могло продолжить работу
    }
  }

  async reauthorizeSession(phoneNumber, maxRetries, retryDelay) {
    logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
    try {
      const session = await this.createOrGetSession(phoneNumber);
      await connectWithRetry(session, 0, maxRetries, retryDelay);

      if (!(await checkAuthorization(session))) {
        logger.warn(`Manual reauthorization required for ${phoneNumber}`);
        throw new Error('MANUAL_REAUTH_REQUIRED');
      }

      logger.info(`Successfully reauthorized session for ${phoneNumber}`);
      return session;
    } catch (error) {
      logger.error(`Error reauthorizing session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  startConnectionCheck() {
    setInterval(async () => {
      for (const [phoneNumber, client] of this.sessions.entries()) {
        try {
          if (!client.connected) {
            logger.warn(
              `Client for ${phoneNumber} is not connected. Attempting to reconnect...`,
            );
            await client.connect();
            logger.info(`Successfully reconnected client for ${phoneNumber}`);
          }
        } catch (error) {
          logger.error(`Error reconnecting client for ${phoneNumber}:`, error);
        }
      }
    }, 60000); // Проверка каждую минуту
  }

  startAuthorizationCheck() {
    setInterval(async () => {
      for (const [phoneNumber, session] of this.sessions.entries()) {
        try {
          const isAuthorized = await checkAuthorization(session);
          if (!isAuthorized) {
            logger.warn(
              `Session for ${phoneNumber} is not authorized. Attempting to reauthorize...`,
            );
            await reauthorizeSession(
              phoneNumber,
              this.MAX_RETRIES,
              this.RETRY_DELAY,
            );
          }
        } catch (error) {
          logger.error(
            `Error checking authorization for ${phoneNumber}:`,
            error,
          );
        }
      }
    }, 300000); // Проверка каждые 5 минут
  }

  async createSession(phoneNumber) {
    const sessionData = await telegramSessionsRepo.getSession(phoneNumber);
    const stringSession = new StringSession(sessionData?.session || '');

    const client = new TelegramClient(
      stringSession,
      config.API_ID,
      config.API_HASH,
      {
        connectionRetries: 3,
        deviceModel: 'MacBookPro16,1',
        systemVersion: 'macOS 11.2.3',
        appVersion: '5.3.1',
        langCode: 'ru',
      },
    );

    client.phoneNumber = phoneNumber;

    try {
      await client.connect();
      logger.info(`Connected client for ${phoneNumber}`);
      this.maintainConnection(client);

      const sessionString = client.session.save();
      await this.saveSession(phoneNumber, sessionString);
      logger.info(`Saved session for ${phoneNumber}`);

      // Добавляем обработчик входящих сообщений
      client.addEventHandler(async (event) => {
        await processIncomingMessage(phoneNumber, event, 'telegram');
      }, new NewMessage({}));

      this.sessions.set(phoneNumber, client);
      return client;
    } catch (error) {
      if (error.code === 406 && error.errorMessage === 'AUTH_KEY_DUPLICATED') {
        logger.warn(
          `AUTH_KEY_DUPLICATED for ${phoneNumber}. Attempting to reauthorize.`,
        );
        return await reauthorizeSession(
          phoneNumber,
          this.MAX_RETRIES,
          this.RETRY_DELAY,
        );
      }
      logger.error(`Error creating session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async authenticateSession(phoneNumber, bot, chatId) {
    let client;
    try {
      client = await this.createOrGetSession(phoneNumber);
    } catch (error) {
      logger.error(`Error getting session for ${phoneNumber}:`, error);
      throw new Error(`Не удалось получить сессию для номера ${phoneNumber}`);
    }

    try {
      await client.start({
        phoneNumber: async () => phoneNumber,
        password: async () =>
          await get2FAPasswordFromUser(phoneNumber, bot, chatId),
        phoneCode: async () =>
          await getAuthCodeFromUser(phoneNumber, bot, chatId),
        onError: (err) => {
          logger.error(`Error during authentication for ${phoneNumber}:`, err);
          if (err.message === 'PHONE_NUMBER_INVALID') {
            bot.sendMessage(
              chatId,
              'Неверный формат номера телефона. Пожалуйста, проверьте номер и попробуйте снова.',
            );
          } else {
            bot.sendMessage(
              chatId,
              `Ошибка при аутентификации: ${err.message}`,
            );
          }
          throw err;
        },
      });

      logger.info(`Session authenticated for ${phoneNumber}`);

      const sessionString = client.session.save();
      await telegramSessionsRepo.saveSession(phoneNumber, sessionString);

      // Добавляем обработчик входящих сообщений после аутентификации
      client.addEventHandler(async (event) => {
        await processIncomingMessage(phoneNumber, event, 'telegram');
      }, new NewMessage({}));

      return client;
    } catch (error) {
      logger.error(`Error authenticating session for ${phoneNumber}:`, error);
      if (error.message !== 'AUTH_USER_CANCEL') {
        bot.sendMessage(chatId, `Ошибка при аутентификации: ${error.message}`);
      }
      throw error;
    }
  }

  async saveSession(phoneNumber, sessionString) {
    try {
      await telegramSessionsRepo.saveSession(phoneNumber, sessionString);
      logger.info(`Session saved for ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error saving session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async generateQRCode(phoneNumber, bot, chatId) {
    try {
      const qrCode = await generateQRCode(phoneNumber);
      await bot.sendMessage(chatId, 'QR-код для аутентификации:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отправить QR-код',
                callback_data: `qr_code_${phoneNumber}`,
              },
            ],
          ],
        },
      });
    } catch (error) {
      logger.error(`Error generating QR code for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async handleSuccessfulAuthentication(phoneNumber, bot, chatId, telegramId) {
    try {
      // Проверяем, существует ли номер телефона в базе данных
      const phoneNumberRecord = await getPhoneNumberInfo(phoneNumber);

      // Если номер не существует, создаем его
      if (!phoneNumberRecord) {
        const user = await getUserByTgId(telegramId);
        logger.info(
          `Phone number ${phoneNumber} not found. Creating new record.`,
        );
        await addPhoneNumber(user.id, phoneNumber, 'telegram');
      }

      // Устанавливаем статус аутентификации
      await setPhoneAuthenticated(phoneNumber, 'telegram', true);
      logger.info(
        `Authentication successful for ${phoneNumber}. Updated database.`,
      );

      // Получаем клиент и сохраняем сессию
      const client = await this.createOrGetSession(phoneNumber);
      if (client) {
        const sessionString = client.session.save();
        await this.saveSession(phoneNumber, sessionString);
        logger.info(`Session saved for ${phoneNumber}`);
      } else {
        logger.warn(
          `No client found for ${phoneNumber}. Unable to save session.`,
        );
      }

      await bot.sendMessage(
        chatId,
        `Номер телефона ${phoneNumber} успешно аутентифицирован.`,
      );
    } catch (error) {
      logger.error(
        `Error updating authentication status for ${phoneNumber}:`,
        error,
      );
      await bot.sendMessage(
        chatId,
        `Произошла ошибка при обновлении статуса аутентификации: ${error.message}`,
      );
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
    try {
      const client = await this.createOrGetSession(phoneNumber);
      if (!client.connected) {
        await client.connect();
        logger.info(`Reconnected client for ${phoneNumber}`);
      }
      return client;
    } catch (error) {
      logger.error(`Error checking session for ${phoneNumber}:`, error);
      throw new Error(`Ошибка проверки сессии для номера ${phoneNumber}`);
    }
  }

  async disconnectSession(phoneNumber) {
    if (this.sessions.has(phoneNumber)) {
      const client = this.sessions.get(phoneNumber);
      try {
        await client.disconnect();
        this.sessions.delete(phoneNumber);
        await telegramSessionsRepo.deleteSession(phoneNumber);
        logger.info(`Session for ${phoneNumber} has been disconnected.`);
      } catch (error) {
        logger.error(`Error disconnecting session for ${phoneNumber}:`, error);
      }
    } else {
      logger.info(`No active session found for ${phoneNumber}`);
    }
  }

  async getDialogs(phoneNumber) {
    const session = await this.createOrGetSession(phoneNumber);
    return session.getDialogs();
  }

  async disconnectAllSessions() {
    if (this.mainClient) {
      await this.mainClient.disconnect();
      this.mainClient = null;
    }

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

  async createOrGetSession(phoneNumber) {
    logger.info(`Creating or getting session for ${phoneNumber}`);

    if (this.sessions.has(phoneNumber)) {
      logger.info(`Existing session found for ${phoneNumber}`);
      const session = this.sessions.get(phoneNumber);
      if (!session.connected) {
        logger.info(`Reconnecting session for ${phoneNumber}`);
        await session.connect();
      }
      return session;
    }

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
      },
    );

    await client.connect();
    logger.info(`Connected client for ${phoneNumber}`);

    const sessionString = client.session.save();
    await this.saveSession(phoneNumber, sessionString);

    this.sessions.set(phoneNumber, client);
    return client;
  }

  async checkTelegram(phoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumber}`);
    try {
      const client = await TelegramMainSessionService.getMainClient();
      const result = await client.invoke(
        new Api.contacts.ResolvePhone({
          phone: phoneNumber,
        }),
      );

      return result.users && result.users.length > 0;
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumber}:`, error);
      return false;
    }
  }
}

const telegramSessionService = new TelegramSessionService();
sessionManager.setTelegramSessionService(telegramSessionService);

module.exports = telegramSessionService;
