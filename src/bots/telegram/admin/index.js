// src/bots/telegram/admin/index.js

const TelegramBot = require('node-telegram-bot-api');

const config = require('../../../config');
const logger = require('../../../utils/logger');
const { isAdmin } = require('../../middlewares/adminCheck');

// Импорт командных модулей
const helpCommands = require('./commands/helpCommands');
const limitCommands = require('./commands/limitCommands');
const statsCommands = require('./commands/statsCommands');
const crmSettingsCommands = require('./commands/crmSettingsCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const userManagementCommands = require('./commands/userManagementCommands');
const phoneManagementCommands = require('./commands/phoneManagementCommands');

const commandModules = [
  helpCommands,
  limitCommands,
  statsCommands,
  crmSettingsCommands,
  subscriptionCommands,
  userManagementCommands,
  phoneManagementCommands,
];

function createAdminBot() {
  const bot = new TelegramBot(config.ADMIN_BOT_TOKEN, { polling: false });
  let isRunning = false;
  let isRestarting = false;
  let pollingError = null;
  let restartAttempts = 0;
  const maxRestartAttempts = 5;

  function handlePollingError(error) {
    logger.error('Admin bot polling error:', error);
    pollingError = error;
    if (
      error.code === 'ETELEGRAM' &&
      error.message.includes('terminated by other getUpdates request')
    ) {
      if (restartAttempts < maxRestartAttempts) {
        restartAttempts++;
        logger.warn(
          `Admin bot: Another instance is running. Attempting to restart... (Attempt ${restartAttempts}/${maxRestartAttempts})`,
        );
        setTimeout(restart, 5000 * restartAttempts); // Увеличиваем задержку с каждой попыткой
      } else {
        logger.error('Max restart attempts reached. Manual intervention required.');
      }
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

  // Обработчик callback_query для кнопок авторизации
  bot.on('callback_query', async (query) => {
    try {
      logger.info(`Received callback query: ${query.data}`);

      const chatId = query.message.chat.id;
      const userId = query.from.id;

      if (!(await isAdmin(userId))) {
        logger.warn(`Unauthorized callback_query attempt by user ${userId}`);
        return;
      }

      const messageId = query.message.message_id;
      const mainPhoneNumber = config.MAIN_TG_PHONE_NUMBER;

      // if (query.data === 'auth_qr') {
      //   logger.info('QR auth selected');
      //   await bot.answerCallbackQuery(query.id);
      //   await bot.editMessageText('Выбрана авторизация через QR-код', {
      //     chat_id: chatId,
      //     message_id: messageId,
      //   });
      //   await startQRAuth(bot, chatId, mainPhoneNumber, userId);
      // } else if (query.data === 'auth_sms') {
      //   logger.info('SMS auth selected');
      //   await bot.answerCallbackQuery(query.id);
      //   await bot.editMessageText('Выбрана авторизация через SMS', {
      //     chat_id: chatId,
      //     message_id: messageId,
      //   });
      //   await startSMSAuth(bot, chatId, mainPhoneNumber, userId);
      // }
    } catch (error) {
      logger.error(
        'Error in callback_query handler:',
        JSON.stringify(error, null, 2),
      );
    }
  });

  // Добавим глобальный обработчик необработанных отклонений промисов
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise);
    logger.error('Reason:', JSON.stringify(reason, null, 2));
  });

  bot.on('polling_error', handlePollingError);

  async function launch() {
    if (isRunning || isRestarting) {
      logger.warn('Admin bot is already running or restarting');
      return;
    }
    logger.info('Starting Admin bot polling');
    try {
      isRestarting = true;
      await stop(); // Всегда останавливаем перед запуском
      await new Promise(resolve => setTimeout(resolve, 5000)); // Увеличенная задержка
      await bot.startPolling({ restart: false, polling: true });
      isRunning = true;
      isRestarting = false;
      pollingError = null;
      restartAttempts = 0;
      logger.info('Admin bot polling started successfully');
    } catch (error) {
      logger.error('Error starting Admin bot polling:', error);
      isRestarting = false;
      throw error;
    }
  }

  async function stop() {
    if (!isRunning) {
      logger.warn('Admin bot is not running');
      return;
    }
    logger.info('Stopping Admin bot polling');
    try {
      await bot.stopPolling();
      isRunning = false;
      logger.info('Admin bot polling stopped successfully');
    } catch (error) {
      logger.error('Error stopping Admin bot polling:', error);
      throw error;
    }
  }

  async function restart() {
    if (isRestarting) {
      logger.warn('Admin bot is already restarting');
      return;
    }
    logger.info('Restarting Admin bot');
    isRestarting = true;
    try {
      await stop();
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await launch();
      logger.info('Admin bot restarted successfully');
    } catch (error) {
      logger.error('Error during Admin bot restart:', error);
    } finally {
      isRestarting = false;
    }
  }

  function resetErrorState() {
    pollingError = null;
    restartAttempts = 0;
  }

  return {
    bot,
    launch,
    stop,
    restart,
    isRunning: () => isRunning,
    getPollingError: () => pollingError,
    resetErrorState,
  };
}

// Экспортируем функцию создания бота вместо готового экземпляра
module.exports = createAdminBot;
