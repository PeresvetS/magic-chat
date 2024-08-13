const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require('fs');
const path = require('path');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const qrcode = require('qrcode');
const { Api } = require("telegram/tl");

class TelegramSessionService {
  constructor() {
    this.sessions = new Map();
    this.sessionDir = path.join(__dirname, '..', '..', 'sessions');
    this.ensureSessionDirExists();
  }

  ensureSessionDirExists() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
      logger.info(`Created sessions directory: ${this.sessionDir}`);
    }
  }

  async createSession(phoneNumber) {
    const sessionFile = path.join(this.sessionDir, `${phoneNumber}.json`);
    let stringSession = new StringSession('');

    if (fs.existsSync(sessionFile)) {
      const sessionData = fs.readFileSync(sessionFile, 'utf8');
      stringSession = new StringSession(sessionData);
      logger.info(`Loaded existing session for ${phoneNumber}`);
    } else {
      logger.info(`Creating new session for ${phoneNumber}`);
    }

    const client = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 3,
      deviceModel: 'MacBookPro16,1',
      systemVersion: 'macOS 11.2.3',
      appVersion: '5.3.1',
      langCode: 'ru',
    });

    try {
      await client.connect();
      logger.info(`Connected client for ${phoneNumber}`);

      const sessionString = client.session.save();
      fs.writeFileSync(sessionFile, sessionString);
      logger.info(`Saved session for ${phoneNumber}`);

      this.sessions.set(phoneNumber, client);
      return client;
    } catch (error) {
      logger.error(`Error creating session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async authenticateSession(phoneNumber, bot, chatId) {
    let client;
    try {
      client = await this.getSession(phoneNumber);
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
      client = await this.getSession(phoneNumber);
    } catch (error) {
      logger.error(`Error getting session for ${phoneNumber}:`, error);
      throw new Error(`Не удалось получить сессию для номера ${phoneNumber}`);
    }
  
    try {
      const result = await client.invoke(new Api.auth.ExportLoginToken({
        apiId: config.API_ID,
        apiHash: config.API_HASH,
        exceptIds: [],
      }));
  
      if (result instanceof Api.auth.LoginToken) {
        const qrCodeData = `tg://login?token=${Buffer.from(result.token).toString('base64')}`;
        const qrCodeImage = await qrcode.toBuffer(qrCodeData);
  
        await bot.sendPhoto(chatId, qrCodeImage, {
          caption: 'Отсканируйте этот QR-код в официальном приложении Telegram для входа'
        });
  
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Timeout: QR-код не был отсканирован'));
          }, 5 * 60 * 1000);
  
          client.addEventHandler((update) => {
            if (update instanceof Api.UpdateLoginToken) {
              clearTimeout(timeoutId);
              resolve(update);
            }
          });
        });
      } else {
        throw new Error('Failed to generate login token');
      }
    } catch (error) {
      logger.error(`Error in QR code authentication for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getAuthCodeFromUser(phoneNumber, bot, chatId) {
    return new Promise((resolve, reject) => {
      const messageText = `Пожалуйста, введите код подтверждения для номера ${phoneNumber} или отправьте /cancel для отмены:`;
      bot.sendMessage(chatId, messageText);
      
      const callback = (msg) => {
        if (msg.chat.id === chatId) {
          if (msg.text.toLowerCase() === '/cancel') {
            bot.removeListener('message', callback);
            reject(new Error('AUTH_USER_CANCEL'));
            return;
          }
          const code = msg.text.trim();
          if (/^\d{5}$/.test(code)) {
            bot.removeListener('message', callback);
            resolve(code);
          } else {
            bot.sendMessage(chatId, 'Неверный формат кода. Пожалуйста, введите 5-значный код или отправьте /cancel для отмены.');
          }
        }
      };

      bot.on('message', callback);

      setTimeout(() => {
        bot.removeListener('message', callback);
        reject(new Error('Timeout: код подтверждения не был введен в течение 5 минут'));
      }, 5 * 60 * 1000);
    });
  }


  async get2FAPasswordFromUser(phoneNumber, bot, chatId) {
    return new Promise((resolve, reject) => {
      bot.sendMessage(chatId, `Пожалуйста, введите пароль двухфакторной аутентификации для номера ${phoneNumber}:`);
      
      const callback = (msg) => {
        if (msg.chat.id === chatId) {
          bot.removeListener('message', callback);
          resolve(msg.text.trim());
        }
      };

      bot.on('message', callback);

      setTimeout(() => {
        bot.removeListener('message', callback);
        reject(new Error('Timeout: пароль не был введен'));
      }, 5 * 60 * 1000);
    });
  }

  async getSession(phoneNumber) {
    if (this.sessions.has(phoneNumber)) {
      logger.info(`Returning existing session for ${phoneNumber}`);
      return this.sessions.get(phoneNumber);
    }
    logger.info(`Creating new session for ${phoneNumber}`);
    return await this.createSession(phoneNumber);
  }

  async checkSession(phoneNumber) {
    try {
      const client = await this.getSession(phoneNumber);
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
        logger.info(`Session for ${phoneNumber} has been disconnected and removed.`);
      } catch (error) {
        logger.error(`Error disconnecting session for ${phoneNumber}:`, error);
        throw error;
      }
    } else {
      logger.info(`No active session found for ${phoneNumber}`);
    }
  }
}

module.exports = new TelegramSessionService();