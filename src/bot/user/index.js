// src/bot/user/index.js

const path = require('path');
const qrcode = require('qrcode');
const fs = require('fs').promises;
const TelegramBot = require('node-telegram-bot-api');

const config = require('../../config');
const logger = require('../../utils/logger');
const { userService } = require('../../services/user');
const wabaCommands = require('./commands/wabaCommands');
const LeadsService = require('../../services/leads/src/LeadsService');
const { getUserState, clearUserState } = require('./utils/userState');
const { TelegramSessionService } = require('../../services/telegram');
const { WhatsAppSessionService } = require('../../services/whatsapp');
const { processExcelFile } = require('../../services/leads').xlsProcessor;
const { setPhoneAuthenticated } =
  require('../../services/phone').phoneNumberService;
const PhoneNumberManagerService = require('../../services/phone/src/PhoneNumberManagerService');
const helpCommands = require('./commands/helpCommands');
const phoneCommands = require('./commands/phoneCommands');
const leadsCommands = require('./commands/leadsCommands');
const promptCommands = require('./commands/promptCommands');
const mailingCommands = require('./commands/mailingCommads');
const crmSettingsCommands = require('./commands/crmSettingsCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const knowledgeBaseCommands = require('./commands/knowledgeBaseCommands');

const commandModules = [
  knowledgeBaseCommands,
  subscriptionCommands,
  crmSettingsCommands,
  mailingCommands,
  promptCommands,
  phoneCommands,
  leadsCommands,
  helpCommands,
  wabaCommands,
];

function createUserBot() {
  const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: false });
  let isRunning = false;
  let pollingError = null;

  function handlePollingError(error) {
    logger.error('User bot polling error:', error);
    pollingError = error;
    if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates request')) {
      logger.warn('User bot: Another instance is running. Attempting to restart...');
      setTimeout(async () => {
        try {
          await bot.stopPolling();
          await bot.startPolling();
          logger.info('User bot restarted successfully');
          pollingError = null;
        } catch (e) {
          logger.error('Error restarting User bot:', e);
        }
      }, 5000);
    }
  }
  

  PhoneNumberManagerService.setNotificationCallback((telegramId, message) => {
    bot.sendMessage(telegramId, message);
  });

  commandModules.forEach((module) => {
    Object.entries(module).forEach(([command, handler]) => {
      if (command !== 'messageHandler') {
        bot.onText(new RegExp(`^${command}`), async (msg, match) => {
          try {
            const userInfo = await userService.getUserInfo(msg.from.id);
            if (!userInfo || !userInfo.isSubscribed) {
              bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для её оформления.');
              return;
            }
            if (userInfo.isBanned) {
              bot.sendMessage(msg.chat.id, 'Вы забанены администратором.');
              return;
            }
            await handler(bot, msg, match);
          } catch (error) {
            logger.error(`Error executing command ${command}:`, error);
            bot.sendMessage(msg.chat.id, `Произошла ошибка при выполнении команды: ${error.message}`);
          }
        });
      }
    });
  });

  Object.entries(knowledgeBaseCommands).forEach(([command, handler]) => {
    if (command !== 'documentHandler') {
      bot.onText(new RegExp(command), (msg, match) => handler(bot, msg, match));
    }
  });

  bot.on('document', (msg) => knowledgeBaseCommands.documentHandler(bot, msg));

  // Обработчик для всех текстовых сообщений
  bot.on('text', async (msg) => {
    if (msg.text.startsWith('/')) {
      return;
    } // Игнорируем команды

    try {
      const userInfo = await userService.getUserInfo(msg.from.id);

      if (!userInfo || !userInfo.isSubscribed) {
        bot.sendMessage(
          msg.chat.id,
          'У вас нет активной подписки. Обратитесь к администратору для её оформления.',
        );
        return;
      }

      if (userInfo.isBanned) {
        bot.sendMessage(msg.chat.id, 'Вы забанены администратором.');
        return;
      }

      if (mailingCommands.messageHandler) {
        await mailingCommands.messageHandler(bot, msg);
      }

      if (promptCommands.messageHandler) {
        await promptCommands.messageHandler(bot, msg);
      }

      if (leadsCommands.messageHandler) {
        await leadsCommands.messageHandler(bot, msg);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке сообщения.');
    }
  });

  bot.on('document', async (msg) => {
    logger.info(`Received document from user ${msg.from.id}`);
    try {
      const userId = msg.from.id;
      const userState = getUserState(userId);

      logger.info(`User state for ${userId}: ${JSON.stringify(userState)}`);

      if (userState && userState.action === 'upload_leads_to_db') {
        const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];

        logger.info(`Processing document for LeadsDB ${userState.leadsDBId}`);

        if (allowedMimeTypes.includes(msg.document.mime_type)) {
          try {
            logger.info(
              `Processing Excel file for LeadsDB ${userState.leadsDBId}`,
            );
            const fileLink = await bot.getFileLink(msg.document.file_id);
            logger.info('Processing Excel file');
            const leads = await processExcelFile(fileLink);
            logger.info(
              `Preparing to add leads to LeadsDB ${userState.leadsDBId}`,
            );
            const addedLeadsCount = await LeadsService.addLeadsToLeadsDB(
              parseInt(userState.leadsDBId),
              leads,
            );
            logger.info(`Leads added to LeadsDB ${userState.leadsDBId}`);
            bot.sendMessage(
              msg.chat.id,
              `Успешно добавлено ${addedLeadsCount} лидов в базу лидов (ID: ${userState.leadsDBId}).`,
            );
          } catch (error) {
            logger.error('Error processing Excel file:', error);
            bot.sendMessage(
              msg.chat.id,
              'Произошла ошибка при обработке Excel файла. Пожалуйста, попробуйте еще раз.',
            );
          } finally {
            clearUserState(userId);
          }
        } else {
          bot.sendMessage(
            msg.chat.id,
            'Пожалуйста, отправьте файл в формате XLS или XLSX.',
          );
        }
      } else {
        logger.info(
          `Received document without active upload_leads_to_db state for user ${userId}`,
        );
        bot.sendMessage(
          msg.chat.id,
          'Пожалуйста, сначала используйте команду /upload_leads_to_db для указания базы лидов, затем отправьте файл.',
        );
      }
    } catch (error) {
      logger.error('Error handling document:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при обработке документа. Пожалуйста, попробуйте еще раз или обратитесь к администратору.',
      );
    }
  });

  bot.on('callback_query', async (query) => {
    const [action, authType, phoneNumber, platform] = query.data.split('_');
    logger.info(`Received callback query: ${query.data}`);

    if (action !== 'auth') return;

    try {
      switch (platform) {
        case 'telegram':
          await handleTelegramAuth(bot, query, phoneNumber, authType);
          break;
        case 'whatsapp':
          await handleWhatsAppAuth(bot, query, phoneNumber, authType);
          break;
        default:
          bot.answerCallbackQuery(query.id, 'Неизвестная платформа');
      }
    } catch (error) {
      logger.error(`Error handling ${platform} authentication:`, error);
      bot.answerCallbackQuery(query.id, `Ошибка аутентификации: ${error.message}`);
    }
  });

  bot.on('polling_error', handlePollingError);
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise);
    logger.error('Reason:', reason);
  });


  async function launch() {
    if (isRunning) {
      logger.warn('User bot is already running');
      return;
    }
    logger.info('Starting User bot polling');
    try {
      await bot.startPolling({ restart: true, polling: true });
      isRunning = true;
      pollingError = null;
      logger.info('User bot polling started successfully');
    } catch (error) {
      logger.error('Error starting User bot polling:', error);
      throw error;
    }
  }

  async function stop() {
    if (!isRunning) {
      logger.warn('User bot is not running');
      return;
    }
    logger.info('Stopping User bot polling');
    try {
      await bot.stopPolling();
      isRunning = false;
      logger.info('User bot polling stopped successfully');
    } catch (error) {
      logger.error('Error stopping User bot polling:', error);
      throw error;
    }
  }

  async function restart() {
    logger.info('Restarting User bot');
    await stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await launch();
    logger.info('User bot restarted successfully');
  }

  async function handleTelegramAuth(bot, query, phoneNumber, authType) {
    try {
      if (authType === 'code') {
        await TelegramSessionService.authenticateSession(phoneNumber, bot, query.message.chat.id);
      } else if (authType === 'qr') {
        await TelegramSessionService.generateQRCode(phoneNumber, bot, query.message.chat.id);
      }
      await setPhoneAuthenticated(phoneNumber, 'telegram', true);
      bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован в Telegram.`);
    } catch (error) {
      bot.sendMessage(query.message.chat.id, `Ошибка аутентификации: ${error.message}`);
    }
  }

  async function handleWhatsAppAuth(bot, query, phoneNumber, authType) {
    try {
      if (authType === 'qr') {
        const { qr, client } = await WhatsAppSessionService.generateQRCode(phoneNumber);
        // Send QR code and wait for authentication
      } else if (authType === 'phone') {
        const client = await WhatsAppSessionService.authenticateWithPhoneNumber(phoneNumber);
        // Wait for authentication
      }
      await setPhoneAuthenticated(phoneNumber, 'whatsapp', true);
      bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован в WhatsApp.`);
    } catch (error) {
      bot.sendMessage(query.message.chat.id, `Ошибка аутентификации: ${error.message}`);
    }
  }
  

  return {
    bot,
    launch,
    stop,
    restart,
    isRunning: () => isRunning,
    getPollingError: () => pollingError,
    handleTelegramAuth,
    handleWhatsAppAuth
  };

}

// async function tryWhatsappAuth(bot, query, phoneNumber, authType) {
//   await bot.answerCallbackQuery(query.id);
//   try {
//     logger.info(`Starting WhatsApp authentication process for ${phoneNumber}`);

//     if (authType === 'qr') {
//       await bot.sendMessage(
//         query.message.chat.id,
//         'Начинаем процесс аутентификации WhatsApp с использованием QR-code. Это может занять некоторое время.',
//       );
//       const { qr, client } =
//         await WhatsAppSessionService.generateQRCode(phoneNumber);
//       if (!qr) {
//         throw new Error('Failed to generate QR code');
//       }
//       logger.info(`QR code generated for ${phoneNumber}`);

//       // Генерируем изображение QR-кода
//       const qrImagePath = path.join(
//         __dirname,
//         `../../../temp/${phoneNumber.replace(/[^a-zA-Z0-9]/g, '')}_qr.png`,
//       );
//       await qrcode.toFile(qrImagePath, qr);

//       // Отправляем изображение QR-кода
//       await bot.sendPhoto(query.message.chat.id, qrImagePath, {
//         caption:
//           'Пожалуйста, отсканируйте этот QR-код в приложении WhatsApp для подключения. У вас есть 5 минут на сканирование.',
//       });

//       // Удаляем временный файл
//       await fs.unlink(qrImagePath);

//       // Ожидаем завершения аутентификации
//       await new Promise((resolve, reject) => {
//         const timeout = setTimeout(() => {
//           reject(new Error('Authentication timeout'));
//         }, 300000); // 5 минут таймаут

//         client.on('ready', () => {
//           clearTimeout(timeout);
//           resolve();
//         });

//         client.on('auth_failure', (msg) => {
//           clearTimeout(timeout);
//           reject(new Error(`Authentication failed: ${msg}`));
//         });
//       });
//     } else if (authType === 'phone') {
//       await bot.sendMessage(
//         query.message.chat.id,
//         'Начинаем процесс аутентификации WhatsApp с использованием номера телефона. Это может занять некоторое время.',
//       );
//       const client =
//         await WhatsAppSessionService.authenticateWithPhoneNumber(phoneNumber);

//       // Ожидаем завершения аутентификации
//       await new Promise((resolve, reject) => {
//         const timeout = setTimeout(() => {
//           reject(new Error('Authentication timeout'));
//         }, 500000);

//         client.on('ready', () => {
//           clearTimeout(timeout);
//           resolve();
//         });

//         client.on('auth_failure', (msg) => {
//           clearTimeout(timeout);
//           reject(new Error(`Authentication failed: ${msg}`));
//         });
//       });
//     }

//     await setPhoneAuthenticated(phoneNumber, 'whatsapp', true);
//     logger.info(`Authentication process completed for ${phoneNumber}`);
//     await bot.sendMessage(
//       query.message.chat.id,
//       `Номер телефона ${phoneNumber} успешно аутентифицирован в WhatsApp.`,
//     );
//   } catch (error) {
//     logger.error(
//       `Error in WhatsApp authentication process for ${phoneNumber}:`,
//       error,
//     );
//     let errorMessage =
//       'Произошла ошибка при аутентификации WhatsApp. Попробуйте ещё раз.';
//     if (error.message.includes('timeout')) {
//       errorMessage =
//         'Время ожидания аутентификации истекло. Пожалуйста, попробуйте еще раз.';
//     } else if (error.message.includes('auth_failure')) {
//       errorMessage =
//         'Ошибка аутентификации WhatsApp. Пожалуйста, убедитесь, что вы правильно ввели номер телефона или отсканировали QR-код.';
//     } else if (error.message.includes('Failed to generate QR code')) {
//       errorMessage =
//         'Не удалось сгенерировать QR-код. Пожалуйста, попробуйте еще раз.';
//     }
//     await bot.sendMessage(query.message.chat.id, errorMessage);
//   }
// }

module.exports = createUserBot();
