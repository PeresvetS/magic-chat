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
    // Аутентификация
    await authenticate();

    // Настройка обработчика сообщений
    setupMessageHandler();

    // Начало прослушивания обновлений
    await getUpdates();

    // Инициализация ботов
    adminBot.startPolling();
    userBot.startPolling();

    // Запуск Express сервера
    const port = config.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    logger.info('Admin bot is running...');
    logger.info('User bot is running...');

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

      cron.schedule('0 0 * * *', async () => {
        try {
          await resetDailyStats();
          logger.info('Daily stats reset completed');
        } catch (error) {
          logger.error('Error during daily stats reset:', error);
        }
      });

      process.exit(0);
    });

  } catch (error) {
    logger.error('Error in main function:', error);
    process.exit(1);
  }
}

main();