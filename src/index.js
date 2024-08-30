const express = require('express');
const cron = require('node-cron');
const config = require('./config');
const bodyParser = require('body-parser');
const { phoneNumberService } = require('./services/phone');
const adminBot = require('./bot/admin');
const userBot = require('./bot/user');
const logger = require('./utils/logger');
const { TelegramSessionService } = require('./services/telegram');
const { WhatsAppSessionService } = require('./services/whatsapp');
const webhookRouter = require('./api/routes/webhooks');
const requestLogger = require('./api/middleware/requestLogger');
const { handleMessageService } = require('./services/messaging');

const app = express();

app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));
app.use(express.json());
app.use(requestLogger);
app.use('/api', webhookRouter);

async function main() {
  try {
    logger.info('Main function started');

    // Инициализация сессий Telegram
    await TelegramSessionService.initializeSessions();

    // Инициализация WhatsApp сессий
    WhatsAppSessionService.onMessage(async (message, phoneNumber) => {
      await handleMessageService.processIncomingMessage(phoneNumber, message, 'whatsapp');
    });

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

  } catch (error) {
    logger.error('Error in main function:', error);
    throw error;
  }
}

module.exports = { main, app };