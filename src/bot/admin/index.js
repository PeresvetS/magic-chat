// src/bot/admin/index.js

const TelegramBot = require('node-telegram-bot-api');

const config = require('../../config');
const logger = require('../../utils/logger');
const { isAdmin } = require('../../middleware/adminCheck');

const helpCommands = require('./commands/helpCommands');
const limitCommands = require('./commands/limitCommands');
const statsCommands = require('./commands/statsCommands');
const crmSettingsCommands = require('./commands/crmSettingsCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const userManagementCommands = require('./commands/userManagementCommands');
const phoneManagementCommands = require('./commands/phoneManagementCommands');


function createAdminBot() {
  const bot = new TelegramBot(config.ADMIN_BOT_TOKEN, { polling: false });
  let isRunning = false;

  const commandModules = [
    helpCommands,
    limitCommands,
    statsCommands,
    crmSettingsCommands,
    subscriptionCommands,
    userManagementCommands,
    phoneManagementCommands,
  ];

  commandModules.forEach(module => {
    Object.entries(module).forEach(([command, handler]) => {
      bot.onText(new RegExp(`^${command}`), async (msg, match) => {
        const userId = msg.from.id;
        logger.info(`Received admin command ${command} from user ${userId}`);
        
        if (await isAdmin(userId)) {
          try {
            await handler(bot, msg, match);
          } catch (error) {
            logger.error(`Error executing admin command ${command}:`, error);
            bot.sendMessage(msg.chat.id, `Произошла ошибка при выполнении команды: ${error.message}`);
          }
        } else {
          logger.warn(`Unauthorized access attempt to admin command ${command} by user ${userId}`);
          bot.sendMessage(msg.chat.id, 'У вас нет прав для использования этой команды.');
        }
      });
    });
  });

  bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
    if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates request')) {
      logger.warn('Another instance is running. Shutting down...');
      isRunning = false;
      bot.stopPolling();
    }
  });

  return {
    bot,
    launch: () => {
      bot.startPolling();
      isRunning = true;
      logger.info('Admin bot started polling');
    },
    stop: () => {
      bot.stopPolling();
      isRunning = false;
      logger.info('Admin bot stopped polling');
    },
    isRunning: () => isRunning
  };
}

module.exports = createAdminBot();