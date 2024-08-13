// src/bot/admin/index.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const { isAdmin } = require('../../middleware/adminCheck');
const subscriptionCommands = require('./commands/subscriptionCommands');
const userManagementCommands = require('./commands/userManagementCommands');
const phoneManagementCommands = require('./commands/phoneManagementCommands');
const limitCommands = require('./commands/limitCommands');
const statsCommands = require('./commands/statsCommands');
const helpCommands = require('./commands/helpCommands');
const logger = require('../../utils/logger');

function createAdminBot() {
  const bot = new TelegramBot(config.ADMIN_BOT_TOKEN, { polling: false });

  const commandModules = [
    subscriptionCommands,
    userManagementCommands,
    phoneManagementCommands,
    limitCommands,
    statsCommands,
    helpCommands
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
      bot.stopPolling();
    }
  });

  return {
    bot,
    launch: () => bot.startPolling(),
    stop: () => bot.stopPolling()
  };
}

module.exports = createAdminBot();