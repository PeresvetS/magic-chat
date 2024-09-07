// src/bot/notification/notificationBot.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const logger = require('../../utils/logger');

class NotificationBot {
  constructor() {
    logger.info('Notification bot initialized');
    this.bot = new TelegramBot(config.NOTIFICATION_BOT_TOKEN, { polling: false });
    this.isRunning = false;
    this.pollingError = null;

    this.bot.on('polling_error', (error) => {
      logger.error('Notification bot polling error:', error);
      this.pollingError = error;
      if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates request')) {
        logger.warn('Notification bot: Conflict detected. Stopping polling...');
        this.stop();
      }
    });
  }

  async launch() {
    if (this.isRunning) {
      logger.warn('Notification bot is already running');
      return;
    }
    logger.info('Starting Notification bot polling');
    try {
      await this.bot.startPolling({ restart: false, polling: true });
      this.isRunning = true;
      this.pollingError = null;
      logger.info('Notification bot polling started successfully');
    } catch (error) {
      logger.error('Error starting Notification bot polling:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Notification bot is not running');
      return;
    }
    logger.info('Stopping Notification bot polling');
    try {
      await this.bot.stopPolling();
      this.isRunning = false;
      logger.info('Notification bot polling stopped successfully');
    } catch (error) {
      logger.error('Error stopping Notification bot polling:', error);
      throw error;
    }
  }

  async sendNotification(telegramId, message) {
    try {
      await this.bot.sendMessage(telegramId, message);
      logger.info(`Notification sent to ${telegramId}`);
    } catch (error) {
      logger.error(`Error sending notification to ${telegramId}:`, error);
    }
  }

  async sendNotificationToMultipleUsers(telegramIds, message) {
    for (const telegramId of telegramIds) {
      await this.sendNotification(telegramId, message);
    }
  }

  isRunning() {
    return this.isRunning;
  }

  getPollingError() {
    return this.pollingError;
  }

  async restart() {
    logger.info('Restarting Notification bot');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд перед перезапуском
    await this.launch();
    logger.info('Notification bot restarted successfully');
  }
}

module.exports = new NotificationBot();