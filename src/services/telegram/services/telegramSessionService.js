// src/services/telegram/telegramSessionService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { Api } = require("telegram/tl");
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const qrcode = require('qrcode');
const { setPhoneAuthenticated } = require('../../phone').phoneNumberService;
const { processIncomingMessage } = require('../../messaging').handleMessageService;
const sessionManager = require('../managers/sessionManager');

class TelegramSessionService {
  constructor() {
    this.sessions = new Map();
    this.sessionDir = path.join(__dirname, '../../../temp/sessions');
    this.ensureSessionDirExists();
    this.startConnectionCheck();
    this.startAuthorizationCheck()
  }

  async ensureSessionDirExists() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
      logger.info(`Session directory ensured: ${this.sessionDir}`);
    } catch (error) {
      logger.error('Error creating session directory:', error);
    }
  }

  async initializeSessions() {
    try {
      const files = await fs.readdir(this.sessionDir);
      for (const file of files) {
        if (file.endsWith('.session')) {
          const phoneNumber = path.parse(file).name;
          await this.createSession(phoneNumber);
          logger.info('Sessions added');
        }
      }
      logger.info('All sessions initialized');
    } catch (error) {
      logger.error('Error initializing sessions:', error);
    }
  }

  async reauthorizeSession(phoneNumber) {
    logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
    try {
      await this.disconnectSession(phoneNumber);
      const client = new TelegramClient(new StringSession(''), config.API_ID, config.API_HASH, {
        connectionRetries: 3,
        deviceModel: 'MacBookPro16,1',
        systemVersion: 'macOS 11.2.3',
        appVersion: '5.3.1',
        langCode: 'ru',
      });
  
      await client.start({
        phoneNumber: async () => phoneNumber,
        password: async () => {
          const password = await this.get2FAPasswordFromUser(phoneNumber);
          if (!password) throw new Error('2FA password is empty');
          return password;
        },
        phoneCode: async () => {
          const code = await this.getAuthCodeFromUser(phoneNumber);
          if (!code) throw new Error('Authentication code is empty');
          return code;
        },
        onError: (err) => {
          logger.error('Reauthorization error:', err);
          throw err;
        },
      });
  
      const sessionString = client.session.save();
      const sessionFile = path.join(this.sessionDir, `${phoneNumber}.session`);
      await fs.writeFile(sessionFile, sessionString);
  
      this.sessions.set(phoneNumber, client);
      logger.info(`Successfully reauthorized session for ${phoneNumber}`);
      return client;
    } catch (error) {
      logger.error(`Failed to reauthorize session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async checkAuthorization(session) {
    try {
      await session.invoke(new Api.users.GetFullUser({
        id: 'me'
      }));
      return true;
    } catch (error) {
      if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
        return false;
      }
      throw error;
    }
  }

  startConnectionCheck() {
    setInterval(async () => {
      for (const [phoneNumber, client] of this.sessions.entries()) {
        try {
          if (!client.connected) {
            logger.warn(`Client for ${phoneNumber} is not connected. Attempting to reconnect...`);
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
          const isAuthorized = await this.checkAuthorization(session);
          if (!isAuthorized) {
            logger.warn(`Session for ${phoneNumber} is not authorized. Attempting to reauthorize...`);
            await this.reauthorizeSession(phoneNumber);
          }
        } catch (error) {
          logger.error(`Error checking authorization for ${phoneNumber}:`, error);
        }
      }
    }, 300000); // Проверка каждые 5 минут
  }

  

  async createSession(phoneNumber) {
    const sessionFile = path.join(this.sessionDir, `${phoneNumber}.session`);
    let stringSession = new StringSession('');

    try {
      const sessionData = await fs.readFile(sessionFile, 'utf8');
      stringSession = new StringSession(sessionData);
      logger.info(`Loaded existing session for ${phoneNumber}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Error reading session file for ${phoneNumber}:`, error);
      } else {
        logger.info(`Creating new session for ${phoneNumber}`);
      }
    }

    const client = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 3,
      deviceModel: 'MacBookPro16,1',
      systemVersion: 'macOS 11.2.3',
      appVersion: '5.3.1',
      langCode: 'ru',
    });

    client.phoneNumber = phoneNumber; 

    try {
      await client.connect();
      logger.info(`Connected client for ${phoneNumber}`);

      const sessionString = client.session.save();
      await fs.writeFile(sessionFile, sessionString);
      logger.info(`Saved session for ${phoneNumber}`);

      // Добавляем обработчик входящих сообщений
      client.addEventHandler(
        async (event) => {
          await processIncomingMessage(phoneNumber, event, client);
        },
        new NewMessage({})
      );

      this.sessions.set(phoneNumber, client);
      return client;
    } catch (error) {
      if (error.code === 406 && error.errorMessage === 'AUTH_KEY_DUPLICATED') {
        logger.warn(`AUTH_KEY_DUPLICATED for ${phoneNumber}. Attempting to reauthorize.`);
        return await this.reauthorizeSession(phoneNumber);
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
        password: async () => await this.get2FAPasswordFromUser(phoneNumber, bot, chatId),
        phoneCode: async () => await this.getAuthCodeFromUser(phoneNumber, bot, chatId),
        onError: (err) => {
          logger.error(`Error during authentication for ${phoneNumber}:`, err);
          if (err.message === 'PHONE_NUMBER_INVALID') {
            bot.sendMessage(chatId, 'Неверный формат номера телефона. Пожалуйста, проверьте номер и попробуйте снова.');
          } else {
            bot.sendMessage(chatId, `Ошибка при аутентификации: ${err.message}`);
          }
          throw err;
        },
      });

      logger.info(`Session authenticated for ${phoneNumber}`);
      return client;
    } catch (error) {
      logger.error(`Error authenticating session for ${phoneNumber}:`, error);
      if (error.message !== 'AUTH_USER_CANCEL') {
        bot.sendMessage(chatId, `Ошибка при аутентификации: ${error.message}`);
      }
      throw error;
    }
  }

  async generateQRCode(phoneNumber, bot, chatId) {
    let client;
    try {
      client = await this.createOrGetSession(phoneNumber);
    } catch (error) {
      logger.error(`Error getting session for ${phoneNumber}:`, error);
      throw new Error(`Не удалось получить сессию для номера ${phoneNumber}`);
    }
  
    try {
      const result = await client.invoke(new Api.auth.ExportLoginToken({
        apiId: parseInt(config.API_ID),
        apiHash: config.API_HASH,
        exceptIds: [],
      }));
  
      if (result instanceof Api.auth.LoginToken) {
        // Правильное форматирование данных для QR-кода
        const token = Buffer.from(result.token).toString('base64url');
        const qrCodeData = `tg://login?token=${token}`;

        logger.info(`Generated QR code data: ${qrCodeData}`);

        const qrCodeImage = await qrcode.toBuffer(qrCodeData);
  
        await bot.sendPhoto(chatId, qrCodeImage, {
          caption: 'Отсканируйте этот QR-код в официальном приложении Telegram для входа'
        });
  
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            client.removeEventHandler(updateHandler);
            reject(new Error('Timeout: QR-код не был отсканирован'));
          }, 5 * 60 * 1000);
  
          const updateHandler = async (update) => {
            if (update instanceof Api.UpdateLoginToken) {
              clearTimeout(timeoutId);
              client.removeEventHandler(updateHandler);
              await this.handleSuccessfulAuthentication(phoneNumber, bot, chatId);
              resolve(update);
            }
          };
  
          client.addEventHandler(updateHandler);
        });
      } else {
        throw new Error('Failed to generate login token');
      }
    } catch (error) {
      logger.error(`Error in QR code authentication for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async handleSuccessfulAuthentication(phoneNumber, bot, chatId) {
    try {
      await setPhoneAuthenticated(phoneNumber, true);
      logger.info(`Authentication successful for ${phoneNumber}. Updated database.`);
      await bot.sendMessage(chatId, `Номер телефона ${phoneNumber} успешно аутентифицирован.`);
    } catch (error) {
      logger.error(`Error updating authentication status for ${phoneNumber}:`, error);
      await bot.sendMessage(chatId, `Аутентификация успешна, но возникла ошибка при обновлении статуса: ${error.message}`);
    }
  }

  async handleSuccessfulAuthentication(phoneNumber, bot, chatId) {
    try {
      await setPhoneAuthenticated(phoneNumber, true);
      logger.info(`Authentication successful for ${phoneNumber}. Updated database.`);
      await bot.sendMessage(chatId, `Номер телефона ${phoneNumber} успешно аутентифицирован.`);
    } catch (error) {
      logger.error(`Error updating authentication status for ${phoneNumber}:`, error);
      await bot.sendMessage(chatId, `Аутентификация успешна, но возникла ошибка при обновлении статуса: ${error.message}`);
    }
  }

  async getAuthCodeFromUser(phoneNumber) {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
  
      rl.question(`Enter the authentication code for ${phoneNumber}: `, (code) => {
        rl.close();
        if (code && code.trim()) {
          resolve(code.trim());
        } else {
          reject(new Error('Authentication code is empty'));
        }
      });
  
      setTimeout(() => {
        rl.close();
        reject(new Error('Timeout: Authentication code was not entered'));
      }, 5 * 60 * 1000); // 5 минут таймаут
    });
  }
  
  async get2FAPasswordFromUser(phoneNumber) {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
  
      rl.question(`Enter the 2FA password for ${phoneNumber}: `, (password) => {
        rl.close();
        if (password && password.trim()) {
          resolve(password.trim());
        } else {
          reject(new Error('2FA password is empty'));
        }
      });
  
      setTimeout(() => {
        rl.close();
        reject(new Error('Timeout: 2FA password was not entered'));
      }, 5 * 60 * 1000);
    });
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
        logger.info(`Session for ${phoneNumber} has been disconnected.`);
      } catch (error) {
        logger.error(`Error disconnecting session for ${phoneNumber}:`, error);
      }
    } else {
      logger.info(`No active session found for ${phoneNumber}`);
    }
  }

  async getDialogs(phoneNumber) {
    // await rateLimiter.limit(`getDialogs:${phoneNumber}`);
    const session = await this.createOrGetSession(phoneNumber);
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

  async createOrGetSession(phoneNumber) {
    try {
      let session = await this.getSession(phoneNumber);
      if (session) {
        logger.info(`Existing session found for ${phoneNumber}. Reusing it.`);
        return session;
      }
      return await this.createSession(phoneNumber);
    } catch (error) {
      if (error.code === 406 && error.errorMessage === 'AUTH_KEY_DUPLICATED') {
        logger.warn(`AUTH_KEY_DUPLICATED for ${phoneNumber}. Attempting to reauthorize.`);
        return await this.reauthorizeSession(phoneNumber);
      }
      throw error;
    }
  }
}

const telegramSessionService = new TelegramSessionService();
sessionManager.setTelegramSessionService(telegramSessionService);

module.exports = telegramSessionService;