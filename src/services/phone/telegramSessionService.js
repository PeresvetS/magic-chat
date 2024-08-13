// src/services/phone/telegramSessionService.js

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const config = require('../../config');
const logger = require('../../utils/logger');

class TelegramSessionService {
  constructor() {
    this.sessions = new Map();
  }

  async createSession(phoneNumber) {
    const sessionFile = path.join(__dirname, '..', '..', 'sessions', `${phoneNumber}.json`);
    let stringSession = new StringSession('');

    if (fs.existsSync(sessionFile)) {
      const sessionData = fs.readFileSync(sessionFile, 'utf8');
      stringSession = new StringSession(sessionData);
    }

    const client = new TelegramClient(stringSession, config.API_ID, config.API_HASH, {
      connectionRetries: 3,
      deviceModel: 'MacBookPro16,1',  // Модель устройства (например, MacBook Pro)
      systemVersion: 'macOS 11.2.3',  // Версия системы (например, macOS Big Sur)
      appVersion: '5.3.1',
      langCode: 'ru',
    });

    await client.connect();

    const sessionString = client.session.save();
    fs.writeFileSync(sessionFile, sessionString);

    this.sessions.set(phoneNumber, client);
    return client;
  }

  async generateQRCode(phoneNumber, bot, chatId) {
    const client = await this.getSession(phoneNumber);
    if (!client) {
      throw new Error('Session not found');
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

  async authenticateSession(phoneNumber, bot, chatId) {
    const client = await this.getSession(phoneNumber);
    if (!client) {
      throw new Error('Session not found');
    }

    try {
      await client.start({
        phoneNumber: async () => phoneNumber,
        password: async () => await this.get2FAPasswordFromUser(phoneNumber, bot, chatId),
        phoneCode: async () => await this.getAuthCodeFromUser(phoneNumber, bot, chatId),
        onError: (err) => logger.error(err),
      });

      logger.info(`Session authenticated for ${phoneNumber}`);
      return client;
    } catch (error) {
      logger.error(`Error authenticating session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getAuthCodeFromUser(phoneNumber, bot, chatId) {
    return new Promise((resolve, reject) => {
      const messageText = `Пожалуйста, введите код подтверждения для номера ${phoneNumber}:`;
      bot.sendMessage(chatId, messageText);
      
      const callback = (msg) => {
        if (msg.chat.id === chatId) {
          const code = msg.text.trim();
          if (/^\d{5}$/.test(code)) {
            bot.removeListener('message', callback);
            resolve(code);
          } else {
            bot.sendMessage(chatId, 'Неверный формат кода. Пожалуйста, введите 5-значный код.');
          }
        }
      };

      bot.on('message', callback);

      // Устанавливаем таймаут на 5 минут
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

      // Устанавливаем таймаут на 5 минут
      setTimeout(() => {
        bot.removeListener('message', callback);
        reject(new Error('Timeout: пароль не был введен'));
      }, 5 * 60 * 1000);
    });
  }

  async getSession(phoneNumber) {
    if (this.sessions.has(phoneNumber)) {
      return this.sessions.get(phoneNumber);
    }
    return await this.createSession(phoneNumber);
  }
}

module.exports = new TelegramSessionService();