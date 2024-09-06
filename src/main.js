// src/main.js

const cron = require('node-cron');
const express = require('express');
const config = require('./config');
const userBot = require('./bot/user');
const adminBot = require('./bot/admin');
const logger = require('./utils/logger');
const bodyParser = require('body-parser');
const { retryOperation } = require('./utils/helpers');
const webhookRouter = require('./api/routes/webhooks');
const { phoneNumberService } = require('./services/phone');
// const { WABASessionService } = require('./services/waba');
const requestLogger = require('./api/middleware/requestLogger');
const { handleMessageService } = require('./services/messaging');
const { WhatsAppSessionService } = require('./services/whatsapp');
const { TelegramSessionService } = require('./services/telegram');
const notificationBot = require('./bot/notification/notificationBot');

const app = express();

app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));
app.use(express.json());
app.use(requestLogger);
app.use('/api', webhookRouter);

async function checkApplicationState() {
  // // Проверка состояния Telegram сессий
  // await TelegramSessionService.checkAllSessions();
  
  // // Проверка состояния WhatsApp сессий
  // await WhatsAppSessionService.checkAllSessions();
  
  // Проверка состояния ботов
  if (!adminBot.isRunning()) {
    logger.warn('Admin bot is not running, attempting to restart...');
    await adminBot.launch();
  }
  if (!userBot.isRunning()) {
    logger.warn('User bot is not running, attempting to restart...');
    await userBot.launch();
  }
}

async function main() {
  try {
    logger.info('Main function started');

    // Инициализация сессий Telegram
    await retryOperation(async () => {
      await TelegramSessionService.initializeSessions();
    }, 3, 5000);

    // Инициализация WhatsApp сессий
    WhatsAppSessionService.onMessage(async (message, phoneNumber) => {
      try {
        await handleMessageService.processIncomingMessage(phoneNumber, message, 'whatsapp');
      } catch (error) {
        logger.error(`Error processing WhatsApp message: ${error.message}`);
      }
    });

    // Инициализация ботов
    logger.info('Initializing bots...');
    await Promise.all([
      retryOperation(async () => adminBot.launch(), 3, 5000),
      retryOperation(async () => userBot.launch(), 3, 5000)
    ]);
    logger.info('Bots initialized and polling started');;

    // Настройка Express
    app.get('/', (req, res) => {
      res.send('Magic Chat server is running');
    });

    // Запуск Express сервера
    const port = config.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // app.all('/waba-webhook', WABASessionService.getWebhookHandler());

    // Функция корректного завершения работы
    async function gracefulShutdown() {
      logger.info('Graceful shutdown initiated');

      server.close(() => {
        logger.info('HTTP server closed');
      });

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

      try {
        notificationBot.stopBot();
      } catch (error) {
        logger.error('Error stopping notification bot:', error);
      }

      try {
        await TelegramSessionService.disconnectAllSessions();
        logger.info('All Telegram sessions disconnected');
      } catch (error) {
        logger.error('Error disconnecting Telegram sessions:', error);
      }

      try {
        for (const [phoneNumber] of WhatsAppSessionService.clients) {
          await WhatsAppSessionService.disconnectSession(phoneNumber);
        }
        logger.info('All WhatsApp sessions disconnected');
      } catch (error) {
        logger.error('Error disconnecting WhatsApp sessions:', error);
      }

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
        await phoneNumberService.resetDailyStats();
        logger.info('Daily stats reset completed');
      } catch (error) {
        logger.error('Error during daily stats reset:', error);
      }
    });
    logger.info('Daily stats reset scheduled');

    setInterval(async () => {
      try {
        await checkApplicationState();
      } catch (error) {
        logger.error('Error during application state check:', error);
      }
    }, 5 * 60 * 1000); // Проверка каждые 5 минут

  } catch (error) {
    logger.error('Error in main function:', error);
    throw error;
  }
}

module.exports = { main, app };