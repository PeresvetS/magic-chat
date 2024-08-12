// src/index.js

const cron = require('node-cron');
const config = require('./config');
const { authenticate } = require('./services/auth/authService');
const { setupMessageHandler, getUpdates } = require('./messaging');
const { resetDailyStats } = require('./services/phoneNumberService');
const { app } = require('./main');
const adminBot = require('./bot/admin');
const userBot = require('./bot/user');
const logger = require('./utils/logger');

async function main() {
  try {
    logger.info('Main function started');
    logger.info('Configuration:', JSON.stringify(config, null, 2));

    // Аутентификация
    logger.info('Starting authentication...');
    await authenticate();
    logger.info('Authentication completed');

    // Настройка обработчика сообщений
    logger.info('Setting up message handler...');
    setupMessageHandler();
    logger.info('Message handler setup completed');

    // Начало прослушивания обновлений
    logger.info('Starting to listen for updates...');
    await getUpdates();
    logger.info('Update listener started');

    // Инициализация ботов
    logger.info('Initializing bots...');
    adminBot.startPolling();
    userBot.startPolling();
    logger.info('Bots initialized and polling started');

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

module.exports = { main };