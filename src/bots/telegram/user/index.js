// src/bots/telegram/user/index.js

const TelegramBot = require('node-telegram-bot-api');

const config = require('../../../config');
const logger = require('../../../utils/logger');
const { getUserInfo } = require('../../../services/user/src/userService');
const { getUserState } = require('./utils/userState');
const { TelegramSessionService } = require('../../../services/telegram');
const { WhatsAppSessionService } = require('../../../services/whatsapp');
const { setPhoneAuthenticated } =
  require('../../../services/phone/src/phoneNumberService');
const PhoneNumberManagerService = require('../../../services/phone/src/PhoneNumberManagerService');
const wabaCommands = require('./commands/wabaCommands');
const helpCommands = require('./commands/helpCommands');
const phoneCommands = require('./commands/phoneCommands');
const leadsCommands = require('./commands/leadsCommands');
const promptCommands = require('./commands/promptCommands');
const mailingCommands = require('./commands/mailingCommads');
const crmSettingsCommands = require('./commands/crmSettingsCommands');
const campaignLLMCommands = require('./commands/campaignLLMCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const knowledgeBaseCommands = require('./commands/knowledgeBaseCommands');

const commandModules = [
  knowledgeBaseCommands,
  subscriptionCommands,
  crmSettingsCommands,
  campaignLLMCommands,
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
  let restartAttempts = 0;
  const maxRestartAttempts = 5;

  function handlePollingError(error) {
    logger.error('User bot polling error:', error);
    pollingError = error;
    if (
      error.code === 'ETELEGRAM' &&
      error.message.includes('terminated by other getUpdates request')
    ) {
      if (restartAttempts < maxRestartAttempts) {
        restartAttempts++;
        logger.warn(
          `User bot: Another instance is running. Attempting to restart... (Attempt ${restartAttempts}/${maxRestartAttempts})`,
        );
        setTimeout(async () => {
          try {
            await stop();
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before restarting
            await launch();
            logger.info('User bot restarted successfully');
            restartAttempts = 0;
          } catch (e) {
            logger.error('Error restarting User bot:', e);
          }
        }, 5000 * restartAttempts); // Increase delay with each attempt
      } else {
        logger.error('Max restart attempts reached. Please check the bot manually.');
      }
    }
  }

  const phoneNumberManager = new PhoneNumberManagerService();

  phoneNumberManager.setNotificationCallback((telegramId, message) => {
    bot.sendMessage(telegramId, message);
  });

  commandModules.forEach((module) => {
    Object.entries(module).forEach(([command, handler]) => {
      if (command !== 'messageHandler') {
        bot.onText(new RegExp(`^${command}`), async (msg, match) => {
          try {
            const userInfo = await getUserInfo(msg.from.id);
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
            await handler(bot, msg, match);
          } catch (error) {
            logger.error(`Error executing command ${command}:`, error);
            bot.sendMessage(
              msg.chat.id,
              `Произошла ошибка при выполнении команды: ${error.message}`,
            );
          }
        });
      }
    });
  });

  bot.on('document', async (msg) => {
    const userState = getUserState(msg.from.id);
  
    if (userState && userState.action === 'add_kb_document') {
      await knowledgeBaseCommands.documentHandler(bot, msg);
    } else if (userState && userState.action === 'upload_leads_to_db') {
      await leadsCommands.documentHandler(bot, msg);
    } else {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, сначала выберите действие (добавление документа в базу знаний или загрузка лидов).');
    }
  });

  // Обработчик для всех текстовых сообщений
  bot.on('text', async (msg) => {
    if (msg.text.startsWith('/')) {
      return;
    } // Игнорируем команды

    try {
      const userInfo = await getUserInfo(msg.from.id);

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

  bot.on('callback_query', async (query) => {
    const [action, authType, phoneNumber, platform] = query.data.split('_');
    logger.info(`Received callback query: ${query.data}`);

    if (action !== 'auth') {
      return;
    }

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
      bot.answerCallbackQuery(
        query.id,
        `Ошибка аутентификации: ${error.message}`,
      );
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
      await bot.stopPolling(); // Ensure any existing polling is stopped
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit before starting
      await bot.startPolling({ restart: false, polling: true });
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await launch();
    logger.info('User bot restarted successfully');
  }

  async function handleTelegramAuth(bot, query, phoneNumber, authType) {
    try {
      let client;
      if (authType === 'code') {
        client = await TelegramSessionService.authenticateSession(
          phoneNumber,
          bot,
          query.message.chat.id,
        );
      } else if (authType === 'qr') {
        client = await TelegramSessionService.generateQRCode(
          phoneNumber,
          bot,
          query.message.chat.id,
        );
      }
      
      if (client) {
        await setPhoneAuthenticated(phoneNumber, 'telegram', true);
        bot.sendMessage(
          query.message.chat.id,
          `Номер телефона ${phoneNumber} успешно аутентифицирован в Telegram.`,
        );
      }
    } catch (error) {
      if (error.message === 'PHONE_NUMBER_INVALID') {
        bot.sendMessage(
          query.message.chat.id,
          'Неверный формат номера телефона. Пожалуйста, проверьте номер и попробуйте снова.',
        );
      } else {
        bot.sendMessage(
          query.message.chat.id,
          `Ошибка аутентификации: ${error.message}`,
        );
      }
    }
  }

  async function handleWhatsAppAuth(bot, query, phoneNumber, authType) {
    try {
      if (authType === 'qr') {
        const { qr, client } =
          await WhatsAppSessionService.generateQRCode(phoneNumber);
        // Send QR code and wait for authentication
      } else if (authType === 'phone') {
        const client =
          await WhatsAppSessionService.authenticateWithPhoneNumber(phoneNumber);
        // Wait for authentication
      }
      await setPhoneAuthenticated(phoneNumber, 'whatsapp', true);
      bot.sendMessage(
        query.message.chat.id,
        `Номер телефона ${phoneNumber} успешно аутентифицирован в WhatsApp.`,
      );
    } catch (error) {
      bot.sendMessage(
        query.message.chat.id,
        `Ошибка аутентификации: ${error.message}`,
      );
    }
  }

  async function checkAndReauthorize(phoneNumber) {
    const client = await TelegramSessionService.getSession(phoneNumber);
    if (!(await TelegramSessionService.checkAuthorization(client))) {
      await TelegramSessionService.reauthorizeSession(phoneNumber, 3, 5000, client);
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
    handleWhatsAppAuth,
    checkAndReauthorize,
  };
}

module.exports = createUserBot();
