// src/bot/user/index.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const { checkSubscription } = require('../../middleware/checkSubscription');
const phoneCommands = require('./commands/phoneCommands');
const { getUserInfo, getUserByTgId } = require('../../services/user');
// const parsingCommands = require('./commands/parsingCommands');
// const campaignCommands = require('./commands/campaignCommands');
const helpCommands = require('./commands/helpCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const { TelegramSessionService } = require('../../services/telegram');
const logger = require('../../utils/logger');

function createUserBot() {
  const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: false });

  const commandModules = [
    phoneCommands,
    // parsingCommands,
    // campaignCommands,
    helpCommands,
    subscriptionCommands
  ];

  commandModules.forEach(module => {
    Object.entries(module).forEach(([command, handler]) => {
      bot.onText(new RegExp(`^${command}`), async (msg, match) => {
       
        try {
          const user = await getUserByTgId( msg.from.id);

          if (!user) {
            bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для её оформления.');
            return;
          }

          const userInfo = await getUserInfo(user.id);
          
          logger.info(`Received command ${command} from user ${user.id}`);
          
          if (userInfo.isBanned) {
            bot.sendMessage(msg.chat.id, 'Вы забанены администратором.');
            return;
          }

          if (await checkSubscription(user.id)) {
            await handler(bot, msg, match);
          } else {
            logger.info(`User ${user.id} does not have an active subscription`);
            bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для продления.');
          }
        } catch (error) {
          logger.error(`Error executing command ${command}:`, error);
          bot.sendMessage(msg.chat.id, `Произошла ошибка при выполнении команды: ${error.message}`);
        }
      });
    });
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
          // Здесь мы не устанавливаем is_authenticated в true, так как процесс аутентификации через QR-код может быть не завершен
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