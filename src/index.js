const express = require('express');
const cron = require('node-cron');
const config = require('./config');
const { setupMessageHandler, getUpdates } = require('./messaging');
const { resetDailyStats } = require('./services/phone/phoneNumberService');
const { initializeTelegramClient } = require('./main');
const adminBot = require('./bot/admin');
const userBot = require('./bot/user');
const logger = require('./utils/logger');

const app = express();

async function main() {
  try {
    logger.info('Main function started');

    // Инициализация и аутентификация Telegram клиента
    const clientInitialized = await initializeTelegramClient();

    let retryCount = 0;
    const maxRetries = 3;

    while (!clientInitialized && retryCount < maxRetries) {
      logger.warn(`Failed to initialize Telegram client. Retrying... (Attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд перед повторной попыткой
      clientInitialized = await initializeTelegramClient();
      retryCount++;
    }

    if (!clientInitialized) {
      logger.warn('Telegram client not initialized. Starting in limited mode.');
      // Здесь можно добавить логику для работы в ограниченном режиме
    } else {
      // Настройка обработчика сообщений только если клиент инициализирован
      logger.info('Setting up message handler...');
      setupMessageHandler();
      logger.info('Message handler setup completed');

      // Начало прослушивания обновлений
      logger.info('Starting to listen for updates...');
      await getUpdates();
      logger.info('Update listener started');
    }

    // Инициализация ботов
    logger.info('Initializing bots...');
    adminBot.startPolling();
    userBot.startPolling();
    logger.info('Bots initialized and polling started');

    // Настройка Express
    app.get('/', (req, res) => {
      res.send('Magic Chat server is running');
    });

    // Запуск Express сервера
    const port = config.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received. Closing HTTP server and stopping bots.');
      
      server.close(() => {
        logger.info('HTTP server closed.');
      });

      try {
        await adminBot.stopPolling();
        logger.info('Admin bot stopped.');
      } catch (error) {
        logger.error('Error stopping admin bot:', error);
      }

      try {
        await userBot.stopPolling();
        logger.info('User bot stopped.');
      } catch (error) {
        logger.error('Error stopping user bot:', error);
      }

      process.exit(0);
    });

    // Планирование ежедневного сброса статистики
    logger.info('Scheduling daily stats reset...');
    cron.schedule('0 0 * * *', async () => {
      try {
        await resetDailyStats();
        logger.info('Daily stats reset completed');
      } catch (error) {
        logger.error('Error during daily stats reset:', error);
      }
    });
    logger.info('Daily stats reset scheduled');

  } catch (error) {
    logger.error('Error in main function:', error);
    throw error;
  }
}

module.exports = { main, app };