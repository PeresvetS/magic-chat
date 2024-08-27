// src/bot/user/index.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const { checkSubscription } = require('../../middleware/checkSubscription');
const phoneCommands = require('./commands/phoneCommands');
const { userService } = require('../../services/user');
// const parsingCommands = require('./commands/parsingCommands');
const mailingCommands = require('./commands/mailingCommads');
const helpCommands = require('./commands/helpCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const { TelegramSessionService } = require('../../services/telegram');
const logger = require('../../utils/logger');
const { setPhoneAuthenticated } = require('../../services/phone').phoneNumberService;
const crmSettingsCommands = require('./commands/crmSettingsCommands');

function createUserBot() {
  const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: false });

  const commandModules = [
    phoneCommands,
    // parsingCommands,
    helpCommands,
    subscriptionCommands,
    mailingCommands,
    crmSettingsCommands
  ];

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

    } catch (error) {
      logger.error('Error handling message:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке сообщения.');
    }
  });


  bot.on('callback_query', async (query) => {
    const [action, authType, phoneNumber] = query.data.split('_');
    logger.info(`Received callback query: ${query.data}`);
  
    if (action === 'auth') {
      if (authType === 'code') {
        try {
          logger.info(`Authenticating session for phone number ${phoneNumber}`);
          await TelegramSessionService.authenticateSession(phoneNumber, bot, query.message.chat.id);
          await setPhoneAuthenticated(phoneNumber, true);
          bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован.`);
        } catch (error) {
          logger.error(`Error authenticating session for phone number ${phoneNumber}:`, error);
          bot.answerCallbackQuery(query.id, { text: `Ошибка при аутентификации номера: ${error.message}` });
        }
      } else if (authType === 'qr') {
        try {
          logger.info(`Generating QR code for phone number ${phoneNumber}`);
          await TelegramSessionService.generateQRCode(phoneNumber, bot, query.message.chat.id);
          // Обработка успешной аутентификации через QR-код теперь происходит внутри метода generateQRCode
        } catch (error) {
          logger.error(`Error generating QR code for phone number ${phoneNumber}:`, error);
          bot.answerCallbackQuery(query.id, { text: `Ошибка при генерации QR-кода: ${error.message}` });
        }
      }
    }
  });

  bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
    if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates request')) {
      logger.warn('Another instance is running. Shutting down...');
      bot.stopPolling();
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

module.exports = createUserBot();