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

  function handlePollingError(error, bot, botType) {
    logger.error(`${botType} bot polling error:`, error);
    if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates request')) {
      logger.warn(`${botType} bot: Another instance is running. Attempting to restart...`);
      setTimeout(async () => {
        try {
          await bot.stopPolling();  // Убедитесь, что polling остановлен
          await bot.startPolling(); // Перезапуск polling
          logger.info(`${botType} bot restarted successfully`);
        } catch (e) {
          logger.error(`Error restarting ${botType} bot:`, e);
        }
      }, 5000); // Подождем 5 секунд перед перезапуском
    }
  }
  

  commandModules.forEach((module) => {
    Object.entries(module).forEach(([command, handler]) => {
      bot.onText(new RegExp(`^${command}`), async (msg, match) => {
        const userId = msg.from.id;
        logger.info(`Received admin command ${command} from user ${userId}`);

        if (await isAdmin(userId)) {
          try {
            await handler(bot, msg, match);
          } catch (error) {
            logger.error(`Error executing admin command ${command}:`, error);
            bot.sendMessage(
              msg.chat.id,
              `Произошла ошибка при выполнении команды: ${error.message}`,
            );
          }
        } else {
          logger.warn(
            `Unauthorized access attempt to admin command ${command} by user ${userId}`,
          );
          bot.sendMessage(
            msg.chat.id,
            'У вас нет прав для использования этой команды.',
          );
        }
      });
    });
  });

  bot.on('polling_error', (error) => handlePollingError(error, bot, 'Admin'));

  return {
    bot,
    launch: () => {
      logger.info('Starting bot polling');
      bot.startPolling({ restart: true, polling: true });
      isRunning = true;
      logger.info('Bot polling started successfully');
    },
    stop: () => {
      logger.info('Stopping bot polling');
      bot.stopPolling();
      isRunning = false;
      logger.info('Bot polling stopped successfully');
    },
    isRunning: () => isRunning,
    restart: async () => {
      logger.info('Restarting bot');
      await bot.stopPolling();
      isRunning = false;
      await new Promise(resolve => setTimeout(resolve, 1000));
      await bot.startPolling({ restart: true, polling: true });
      isRunning = true;
      logger.info('Bot restarted successfully');
    }
  };
}

module.exports = createAdminBot();
