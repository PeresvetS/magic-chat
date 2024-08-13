// src/index.js

const express = require('express');
const cron = require('node-cron');
const config = require('./config');
const { resetDailyStats } = require('./services/phone/phoneNumberService');
const adminBot = require('./bot/admin');
const userBot = require('./bot/user');
const logger = require('./utils/logger');

const app = express();

async function main() {
  try {
    logger.info('Main function started');

    // Инициализация ботов
    logger.info('Initializing bots...');
    adminBot.launch();
    userBot.launch();
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

    // Функция корректного завершения работы
    async function gracefulShutdown() {
      logger.info('Graceful shutdown initiated');

      // Остановка Express сервера
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Остановка ботов
      try {
        await adminBot.stop();
        logger.info('Admin bot stopped');
      } catch (error) {
        logger.error('Error stopping admin bot:', error);
      }

      try {
        await userBot.stop();
        logger.info('User bot stopped');
      } catch (error) {
        logger.error('Error stopping user bot:', error);
      }

      // Освобождение блокировки (эта функция должна быть определена в основном index.js)
      if (typeof global.releaseLock === 'function') {
        global.releaseLock();
      }

      process.exit(0);
    }

    // Обработка сигналов завершения
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

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