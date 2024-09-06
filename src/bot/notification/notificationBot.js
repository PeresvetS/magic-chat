// src/bot/notification/notificationBot.js

const TelegramBot = require('node-telegram-bot-api');

const config = require('../../config');
const logger = require('../../utils/logger');

class NotificationBot {
  constructor() {
    logger.info('Notification bot initialized');
    this.bot = new TelegramBot(config.NOTIFICATION_BOT_TOKEN, {
      polling: true,
    });
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

  stopBot() {
    if (this.bot) {
      this.bot.stopPolling();
      logger.info('Notification bot stopped');
    }
  }
}

module.exports = new NotificationBot();
