// src/bot/user/index.js

const path = require('path');
const qrcode = require('qrcode');
const fs = require('fs').promises;
const TelegramBot = require('node-telegram-bot-api');

const config = require('../../config');
const logger = require('../../utils/logger');
const { userService } = require('../../services/user');
const LeadsService = require('../../services/leads/src/LeadsService');
const { getUserState, clearUserState } = require('./utils/userState');
const { TelegramSessionService } = require('../../services/telegram');
const { WhatsAppSessionService } = require('../../services/whatsapp/');
const { campaignsMailingService } = require('../../services/campaign');
const { processExcelFile } = require('../../services/leads').xlsProcessor;
const { checkSubscription } = require('../../middleware/checkSubscription');
const { setPhoneAuthenticated } = require('../../services/phone').phoneNumberService;
const PhoneNumberManagerService = require('../../services/phone/src/PhoneNumberManagerService');

const helpCommands = require('./commands/helpCommands');
const phoneCommands = require('./commands/phoneCommands');
const leadsCommands = require('./commands/leadsCommands');
const promptCommands = require('./commands/promptCommands');
const mailingCommands = require('./commands/mailingCommads');
// const parsingCommands = require('./commands/parsingCommands');
const crmSettingsCommands = require('./commands/crmSettingsCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');

const userStates = {};

function createUserBot() {
  const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: false });
  // const bot = new TelegramBot(token, { polling: true, filepath: false });
  const commandModules = [
    subscriptionCommands,
    crmSettingsCommands,
    // parsingCommands,
    mailingCommands,
    promptCommands,
    phoneCommands,
    leadsCommands,
    helpCommands,
  ];

  PhoneNumberManagerService.setNotificationCallback((telegramId, message) => {
    bot.sendMessage(telegramId, message);
  });

  commandModules.forEach(module => {
    Object.entries(module).forEach(([command, handler]) => {
      if (command !== 'messageHandler') {
        bot.onText(new RegExp(`^${command}`), async (msg, match) => {
          try {
            const userInfo = await userService.getUserInfo(msg.from.id);

            if (!userInfo || !userInfo.isSubscribed) {
              logger.info(`User ${user.id} does not have an active subscription`);
              bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для её оформления.');
              return;
            }
            
            logger.info(`Received command ${command} from user ${userInfo.id}`);
            
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

  // Обработчик для всех текстовых сообщений
  bot.on('text', async (msg) => {
    if (msg.text.startsWith('/')) return; // Игнорируем команды

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
          'application/vnd.ms-excel'
        ];
  
        logger.info(`Processing document for LeadsDB ${userState.leadsDBId}`);
        
        if (allowedMimeTypes.includes(msg.document.mime_type)) {
          try {
            logger.info(`Processing Excel file for LeadsDB ${userState.leadsDBId}`);
            const fileLink = await bot.getFileLink(msg.document.file_id);
            logger.info(`Processing Excel file`);
            const leads = await processExcelFile(fileLink);
            logger.info(`Preparing to add leads to LeadsDB ${userState.leadsDBId}`);
            const addedLeadsCount = await LeadsService.addLeadsToLeadsDB(parseInt(userState.leadsDBId), leads);
            logger.info(`Leads added to LeadsDB ${userState.leadsDBId}`);
            bot.sendMessage(msg.chat.id, `Успешно добавлено ${addedLeadsCount} лидов в базу лидов (ID: ${userState.leadsDBId}).`);
          } catch (error) {
            logger.error('Error processing Excel file:', error);
            bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке Excel файла. Пожалуйста, попробуйте еще раз.');
          } finally {
            clearUserState(userId);
          }
        } else {
          bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте файл в формате XLS или XLSX.');
        }
      } else {
        logger.info(`Received document without active upload_leads_to_db state for user ${userId}`);
        bot.sendMessage(msg.chat.id, 'Пожалуйста, сначала используйте команду /upload_leads_to_db для указания базы лидов, затем отправьте файл.');
      }
    } catch (error) {
      logger.error('Error handling document:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке документа. Пожалуйста, попробуйте еще раз или обратитесь к администратору.');
    }
  });
  
  


  bot.on('callback_query', async (query) => {
    const [action, authType, phoneNumber, platform] = query.data.split('_');
    logger.info(`Received callback query: ${query.data}`);
  
    if (action !== 'auth') {
      return;
    }
  
    switch (platform) {
      case 'telegram':
        await tryTelegramAuth(bot, query, phoneNumber, authType);
        break;
      case 'whatsapp':
        await tryWhatsappAuth(bot, query, phoneNumber, authType);
        break;
      default:
        bot.answerCallbackQuery(query.id, 'Неизвестная платформа');
        break;
    }
  });

  bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
    if (error.code === 'ETELEGRAM' && error.message.includes('Bad Gateway')) {
      logger.warn('Telegram API временно недоступен. Переподключение...');
      bot.stopPolling().then(() => {
        setTimeout(() => {
          bot.startPolling();
        }, 5000); // Попытка переподключения через 5 секунд
      });
    }
  });

  return {
    bot,
    launch: () => {
      logger.info('Starting bot polling');
      bot.startPolling();
      logger.info('Bot polling started successfully');
    },
    stop: () => {
      logger.info('Stopping bot polling');
      bot.stopPolling();
      logger.info('Bot polling stopped successfully');
    }
  };
}


async function tryTelegramAuth(bot, query, phoneNumber, authType) {
  if (authType === 'code') {
    try {
      logger.info(`Authenticating Telegram session for phone number ${phoneNumber}`);
      await TelegramSessionService.authenticateSession(phoneNumber, bot, query.message.chat.id);
      await setPhoneAuthenticated(phoneNumber, 'telegram', true);
      bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован в Telegram.`);
    } catch (error) {
      logger.error(`Error authenticating Telegram session for phone number ${phoneNumber}:`, error);
      bot.answerCallbackQuery(query.id, { text: `Ошибка при аутентификации номера в Telegram: ${error.message}` });
    }
  } else if (authType === 'qr') {
    try {
      logger.info(`Generating QR code for Telegram phone number ${phoneNumber}`);
      await TelegramSessionService.generateQRCode(phoneNumber, bot, query.message.chat.id);
      // Обработка успешной аутентификации через QR-код происходит внутри метода generateQRCode
    } catch (error) {
      logger.error(`Error generating QR code for Telegram phone number ${phoneNumber}:`, error);
      bot.answerCallbackQuery(query.id, { text: `Ошибка при генерации QR-кода для Telegram: ${error.message}` });
    }
  }
}

async function tryWhatsappAuth(bot, query, phoneNumber, authType) {
  await bot.answerCallbackQuery(query.id);
  try {
    logger.info(`Starting WhatsApp authentication process for ${phoneNumber}`);

    if (authType === 'qr') {
      await bot.sendMessage(query.message.chat.id, 'Начинаем процесс аутентификации WhatsApp с использованием QR-code. Это может занять некоторое время.');
      const { qr, client } = await WhatsAppSessionService.generateQRCode(phoneNumber);
      if (!qr) {
        throw new Error('Failed to generate QR code');
      }
      logger.info(`QR code generated for ${phoneNumber}`);

      // Генерируем изображение QR-кода
      const qrImagePath = path.join(__dirname, `../../../temp/${phoneNumber.replace(/[^a-zA-Z0-9]/g, '')}_qr.png`);
      await qrcode.toFile(qrImagePath, qr);

      // Отправляем изображение QR-кода
      await bot.sendPhoto(query.message.chat.id, qrImagePath, {
        caption: 'Пожалуйста, отсканируйте этот QR-код в приложении WhatsApp для подключения. У вас есть 5 минут на сканирование.'
      });

      // Удаляем временный файл
      await fs.unlink(qrImagePath);

      // Ожидаем завершения аутентификации
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 300000); // 5 минут таймаут

        client.on('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.on('auth_failure', (msg) => {
          clearTimeout(timeout);
          reject(new Error(`Authentication failed: ${msg}`));
        });
      });

    } else if (authType === 'phone') {
      await bot.sendMessage(query.message.chat.id, 'Начинаем процесс аутентификации WhatsApp с использованием номера телефона. Это может занять некоторое время.');
      const client = await WhatsAppSessionService.authenticateWithPhoneNumber(phoneNumber);
      
      // Ожидаем завершения аутентификации
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 500000); 

        client.on('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.on('auth_failure', (msg) => {
          clearTimeout(timeout);
          reject(new Error(`Authentication failed: ${msg}`));
        });
      });
    }

    await setPhoneAuthenticated(phoneNumber, 'whatsapp', true);
    logger.info(`Authentication process completed for ${phoneNumber}`);
    await bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован в WhatsApp.`);
  } catch (error) {
    logger.error(`Error in WhatsApp authentication process for ${phoneNumber}:`, error);
    let errorMessage = 'Произошла ошибка при аутентификации WhatsApp. Попробуйте ещё раз.';
    if (error.message.includes('timeout')) {
      errorMessage = 'Время ожидания аутентификации истекло. Пожалуйста, попробуйте еще раз.';
    } else if (error.message.includes('auth_failure')) {
      errorMessage = 'Ошибка аутентификации WhatsApp. Пожалуйста, убедитесь, что вы правильно ввели номер телефона или отсканировали QR-код.';
    } else if (error.message.includes('Failed to generate QR code')) {
      errorMessage = 'Не удалось сгенерировать QR-код. Пожалуйста, попробуйте еще раз.';
    }
    await bot.sendMessage(query.message.chat.id, errorMessage);
  }

}



module.exports = createUserBot();