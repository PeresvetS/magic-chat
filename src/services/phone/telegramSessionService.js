// src/services/phone/telegramSessionService.js

const { MTProto } = require('telegram-mtproto');
const { Storage } = require('mtproto-storage-fs');
const config = require('../config');
const logger = require('../utils/logger');
const qrCodeService = require('./qrCodeService');

class TelegramSessionService {
  constructor() {
    this.sessions = new Map();
    this.authCallbacks = new Map();
  }

  async createSession(phoneNumber) {
    const api = {
      layer: 57,
      initConnection: 0x69796de9,
      api_id: config.API_ID,
      api_hash: config.API_HASH,
      app_version: '1.0.0',
      device_model: 'Desktop',
      system_version: 'Windows 10'
    };

    const client = MTProto({
      api,
      app: {
        storage: new Storage(`./sessions/${phoneNumber}.json`)
      }
    });

    this.sessions.set(phoneNumber, client);
    return client;
  }

  async generateQRCode(phoneNumber, bot, chatId) {
    const client = this.sessions.get(phoneNumber);
    if (!client) {
      throw new Error('Session not found');
    }

    try {
      const { qrCodeImage, loginToken } = await qrCodeService.generateLoginQRCode(client, phoneNumber);

      // Отправляем QR-код пользователю
      await bot.sendPhoto(chatId, qrCodeImage, {
        caption: 'Отсканируйте этот QR-код в официальном приложении Telegram для входа'
      });

      // Ожидаем завершения процесса авторизации
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout: QR-код не был отсканирован'));
        }, 5 * 60 * 1000);

        client.on('updateLoginToken', async () => {
          clearTimeout(timeoutId);
          try {
            const authResult = await client('auth.importLoginToken', { login_token: loginToken });
            resolve(authResult);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      logger.error(`Error in QR code authentication for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async authenticateSession(phoneNumber, bot, chatId) {
    const client = this.sessions.get(phoneNumber);
    if (!client) {
      throw new Error('Session not found');
    }


    try {
      const { phone_code_hash } = await client('auth.sendCode', {
        phone_number: phoneNumber,
        settings: {
          _: 'codeSettings'
        }
      });

      const code = await this.getAuthCodeFromUser(phoneNumber, bot, chatId);

      try {
        const signInResult = await client('auth.signIn', {
          phone_number: phoneNumber,
          phone_code_hash: phone_code_hash,
          phone_code: code
        });
        logger.info(`Session authenticated for ${phoneNumber}`);
        return signInResult;
      } catch (error) {
        if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
          logger.info(`2FA required for ${phoneNumber}`);
          const password = await this.get2FAPasswordFromUser(phoneNumber, bot, chatId);
          const { srp_id, current_algo, srp_B } = await client('account.getPassword');
          const { g, p, salt1, salt2 } = current_algo;
          const { A, M1 } = await client.crypto.getSRPParams({
            g,
            p,
            salt1,
            salt2,
            gB: srp_B,
            password,
          });
          const checkPasswordResult = await client('auth.checkPassword', {
            password: {
              _: 'inputCheckPasswordSRP',
              srp_id,
              A,
              M1,
            },
          });
          logger.info(`2FA authentication successful for ${phoneNumber}`);
          return checkPasswordResult;
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error(`Error authenticating session for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getAuthCodeFromUser(phoneNumber, bot, chatId) {
    return new Promise((resolve, reject) => {
      bot.sendMessage(chatId, `Пожалуйста, введите код подтверждения для номера ${phoneNumber}:`);
      
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
        reject(new Error('Timeout: код подтверждения не был введен'));
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

  getSession(phoneNumber) {
    return this.sessions.get(phoneNumber);
  }

  async getAuthCodeFromUser(phoneNumber) {
    // Здесь должна быть реализация получения кода от пользователя
    // Например, через ввод в консоль или через бота
    return '12345'; // Заглушка
  }
}

module.exports = new TelegramSessionService();