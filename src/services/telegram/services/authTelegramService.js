// src/services/telegram/services/authTelegramService.js

const { Api } = require('telegram/tl');
const logger = require('../../../utils/logger');
const qrcode = require('qrcode');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const config = require('../../../config');


async function connectWithRetry(telegramClient, retries = 0, maxRetries = 3, retryDelay = 5000) {
    try {
      await telegramClient.connect();
      logger.info('Successfully connected to Telegram');
    } catch (error) {
      if (retries < maxRetries) {
        logger.warn(
          `Failed to connect to Telegram. Retrying in ${retryDelay / 1000} seconds...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        await connectWithRetry(telegramClient, retries + 1);
      } else {
        logger.error('Failed to connect to Telegram after multiple attempts');
        throw error;
      }
    }
  }

async function getAuthCodeFromUser(phoneNumber, bot, chatId) {
    return new Promise((resolve, reject) => {
      bot.sendMessage(
        chatId,
        `Пожалуйста, введите код аутентификации для номера ${phoneNumber}:`,
      );

      const listener = (msg) => {
        if (msg.chat.id === chatId) {
          const code = msg.text.trim();
          if (code) {
            bot.removeListener('text', listener);
            resolve(code);
          } else {
            bot.sendMessage(
              chatId,
              'Код не может быть пустым. Пожалуйста, введите код еще раз:',
            );
          }
        }
      };

      bot.on('text', listener);

      setTimeout(
        () => {
          bot.removeListener('text', listener);
          reject(new Error('Timeout: Authentication code was not entered'));
        },
        5 * 60 * 1000,
      ); // 5 минут таймаут
    });
  }


  async function get2FAPasswordFromUser(phoneNumber, bot, chatId) {
    return new Promise((resolve, reject) => {
      bot.sendMessage(
        chatId,
        `Пожалуйста, введите пароль 2FA для номера ${phoneNumber}:`,
      );

      const listener = (msg) => {
        if (msg.chat.id === chatId) {
          const password = msg.text.trim();
          if (password) {
            bot.removeListener('text', listener);
            resolve(password);
          } else {
            bot.sendMessage(
              chatId,
              'Пароль не может быть пустым. Пожалуйста, введите пароль еще раз:',
            );
          }
        }
      };

      bot.on('text', listener);

      setTimeout(
        () => {
          bot.removeListener('text', listener);
          reject(new Error('Timeout: 2FA password was not entered'));
        },
        5 * 60 * 1000,
      ); // 5 минут таймаут
    });
  }


  async function generateQRCode(phoneNumber, bot, chatId, userId) {
    try {
    logger.warn(`Client for ${phoneNumber} is null, attempting to create a new session`);
    const stringSession = new StringSession(''); // Start with empty session
    client = new TelegramClient(
        stringSession,
        parseInt(config.API_ID),
        config.API_HASH,
        { connectionRetries: 5 }
    );
    await client.connect();

      if (!client.connected) {
        logger.info(`Connecting client for ${phoneNumber}`);
        await client.connect();
      }

      const result = await client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: parseInt(config.API_ID),
          apiHash: config.API_HASH,
          exceptIds: [],
        })
      );

      if (result instanceof Api.auth.LoginToken) {
        const token = Buffer.from(result.token).toString('base64url');
        const qrCodeData = `tg://login?token=${token}`;
        logger.info(`Generated QR code data: ${qrCodeData}`);

        const qrCodeImage = await qrcode.toBuffer(qrCodeData);

        await bot.sendPhoto(chatId, qrCodeImage, {
          caption: 'Отсканируйте этот QR-код в официальном приложении Telegram для входа',
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
              await this.handleSuccessfulAuthentication(phoneNumber, bot, chatId, userId);
              resolve(update);
            }
          };

          client.addEventHandler(updateHandler);
        });
      }
      throw new Error('Failed to generate login token');
    } catch (error) {
      logger.error(`Error in QR code authentication for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async function checkAuthorization(client) {
    try {
      await client.invoke(new Api.users.GetFullUser({ id: 'me' }));
      return true;
    } catch (error) {
      if (error.errorMessage === 'AUTH_KEY_UNREGISTERED') {
        logger.warn('AUTH_KEY_UNREGISTERED error detected. Session needs reauthorization.');
        return false;
      }
      throw error;
    }
  }



  module.exports = {
    getAuthCodeFromUser,
    get2FAPasswordFromUser,
    generateQRCode,
    checkAuthorization,
    connectWithRetry,
  };