// src/bot/notification/notificationBot.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const logger = require('../../utils/logger');

function createNotificationBot() {
  const bot = new TelegramBot(config.NOTIFICATION_BOT_TOKEN, { polling: false });
  let isRunning = false;
  let pollingError = null;

  function handlePollingError(error) {
    logger.error('Notification bot polling error:', error);
    pollingError = error;
    if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates request')) {
      logger.warn('Notification bot: Conflict detected. Stopping polling...');
      stop();
    }
  }

  bot.on('polling_error', handlePollingError);

  async function launch() {
    if (isRunning) {
      logger.warn('Notification bot is already running');
      return;
    }
    logger.info('Starting Notification bot polling');
    try {
      await bot.startPolling({ restart: false, polling: true });
      isRunning = true;
      pollingError = null;
      logger.info('Notification bot polling started successfully');
    } catch (error) {
      logger.error('Error starting Notification bot polling:', error);
      throw error;
    }
  }

  async function stop() {
    if (!isRunning) {
      logger.warn('Notification bot is not running');
      return;
    }
    logger.info('Stopping Notification bot polling');
    try {
      await bot.stopPolling();
      isRunning = false;
      logger.info('Notification bot polling stopped successfully');
    } catch (error) {
      logger.error('Error stopping Notification bot polling:', error);
      throw error;
    }
  }

  async function restart() {
    logger.info('Restarting Notification bot');
    await stop();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд перед перезапуском
    await launch();
    logger.info('Notification bot restarted successfully');
  }

  async function sendNotification(telegramId, message) {
    try {
      await bot.sendMessage(telegramId, message);
      logger.info(`Notification sent to ${telegramId}`);
    } catch (error) {
      logger.error(`Error sending notification to ${telegramId}:`, error);
    }
  }

  async function sendNotificationToMultipleUsers(telegramIds, message) {
    for (const telegramId of telegramIds) {
      await sendNotification(telegramId, message);
    }
  }

  return {
    launch,
    stop,
    restart,
    isRunning: () => isRunning,
    getPollingError: () => pollingError,
    sendNotification,
    sendNotificationToMultipleUsers
  };
}

module.exports = createNotificationBot();