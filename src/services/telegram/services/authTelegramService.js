// src/services/telegram/services/authTelegramService.js

const { Api } = require('telegram/tl');
const qrcode = require('qrcode');
const logger = require('../../../utils/logger');
const config = require('../../../config');
const { getUserByTgId } = require('../../user/src/userService');
const { phoneNumberService } =
  require('../../phone/src/phoneNumberService');
const { telegramSessionsRepo } = require('../../../db');

async function connectWithRetry(
  telegramClient,
  retries = 0,
  maxRetries = 3,
  retryDelay = 5000,
) {
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

async function saveSession(phoneNumber, client, sessionString) {
  try {
    await telegramSessionsRepo.saveSession(phoneNumber, sessionString);
    client.session.setString(sessionString);
    logger.info(`Session saved for ${phoneNumber}`);
  } catch (error) {
    logger.error(`Error saving session for ${phoneNumber}:`, error);
    throw error;
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

async function handleSuccessfulAuthentication(phoneNumber, bot, chatId) {
  try {
    // Проверяем, существует ли номер телефона в базе данных
    const phoneNumberRecord = await phoneNumberService.getPhoneNumberInfo(phoneNumber);

    // Если номер не существуе��, создаем его
    if (!phoneNumberRecord) {
      const user = await getUserByTgId(chatId);
      logger.info(
        `Phone number ${phoneNumber} not found. Creating new record.`,
      );
      await phoneNumberService.addPhoneNumber(user.id, phoneNumber, 'telegram');
    }

    // Устанавливаем статус аутентификации
    await phoneNumberService.setPhoneAuthenticated(phoneNumber, 'telegram', true);
    logger.info(
      `Authentication successful for ${phoneNumber}. Updated database.`,
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

async function generateQRCode(phoneNumber, bot, chatId, client) {
  try {
    logger.warn(
      `Client for ${phoneNumber} is null, attempting to create a new session`,
    );

    if (!client.connected) {
      logger.info(`Connecting client for ${phoneNumber}`);
      await client.connect();
    }

    const result = await client.invoke(
      new Api.auth.ExportLoginToken({
        apiId: parseInt(config.API_ID),
        apiHash: config.API_HASH,
        exceptIds: [],
      }),
    );

    if (result instanceof Api.auth.LoginToken) {
      const token = Buffer.from(result.token).toString('base64url');
      const qrCodeData = `tg://login?token=${token}`;
      logger.info(`Generated QR code data: ${qrCodeData}`);

      const qrCodeImage = await qrcode.toBuffer(qrCodeData);

      await bot.sendPhoto(chatId, qrCodeImage, {
        caption:
          'Отсканируйте этот QR-код в официальном приложении Telegram для входа',
      });

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(
          () => {
            client.removeEventHandler(updateHandler);
            reject(new Error('Timeout: QR-код не был отсканирован'));
          },
          5 * 60 * 1000,
        );

        const updateHandler = async (update) => {
          if (update instanceof Api.UpdateLoginToken) {
            clearTimeout(timeoutId);
            client.removeEventHandler(updateHandler);
            await handleSuccessfulAuthentication(phoneNumber, bot, chatId, userId);
            resolve(update);
          }
        };

        client.addEventHandler(updateHandler);
        return client;
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
      logger.warn(
        'AUTH_KEY_UNREGISTERED error detected. Session needs reauthorization.',
      );
      return false;
    }
    logger.error('Error checking authorization:', error);
    return false;
  }
}

async function reauthorizeSession(phoneNumber, maxRetries, retryDelay, session) {
  try {
    logger.info(`Attempting to reauthorize session for ${phoneNumber}`);
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

async function authenticateSession(phoneNumber, bot, chatId, client) {
  try {
    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () =>
        await authTelegramService.get2FAPasswordFromUser(phoneNumber, bot, chatId),
      phoneCode: async () =>
        await authTelegramService.getAuthCodeFromUser(phoneNumber, bot, chatId),
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

    return client;
  } catch (error) {
    logger.error(`Error authenticating session for ${phoneNumber}:`, error);
    if (error.message !== 'AUTH_USER_CANCEL') {
      bot.sendMessage(chatId, `Ошибка при аутентикации: ${error.message}`);
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
  reauthorizeSession,
  authenticateSession,
};
