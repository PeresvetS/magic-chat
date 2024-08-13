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
    await adminBot.launch();
    await userBot.launch();
    logger.info('Bots initialized and polling started');

    // Отправка приветственного сообщения с доступными командами
    await sendWelcomeMessages();

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
        await adminBot.stop();
        logger.info('Admin bot stopped.');
      } catch (error) {
        logger.error('Error stopping admin bot:', error);
      }

      try {
        await userBot.stop();
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

async function sendWelcomeMessages() {
  const adminCommands = '/help - Показать список доступных команд';
  const userCommands = '/help - Показать список доступных команд';

  try {
    await adminBot.telegram.sendMessage(config.ADMIN_CHAT_ID, `Бот запущен. Доступные команды:\n${adminCommands}`);
    logger.info('Welcome message sent to admin');
  } catch (error) {
    logger.error('Error sending welcome message to admin:', error);
  }

  try {
    await userBot.telegram.sendMessage(config.USER_CHAT_ID, `Бот запущен. Доступные команды:\n${userCommands}`);
    logger.info('Welcome message sent to user');
  } catch (error) {
    logger.error('Error sending welcome message to user:', error);
  }
}

module.exports = { main, app };