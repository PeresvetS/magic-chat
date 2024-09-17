// src/main.js

const cron = require('node-cron');
const express = require('express');
const bodyParser = require('body-parser');

const config = require('./config');
const userBot = require('./bot/user');
const adminBot = require('./bot/admin');
const logger = require('./utils/logger');
const { retryOperation } = require('./utils/helpers');
const webhookRouter = require('./api/routes/webhooks');
const { phoneNumberService } = require('./services/phone');
const { messageMailingService } = require('./services/mailing');
const requestLogger = require('./api/middleware/requestLogger');
const { WhatsAppSessionService } = require('./services/whatsapp');
const { TelegramSessionService } = require('./services/telegram');
const notificationBot = require('./bot/notification/notificationBot');
const { handleMessageService, processPendingMessages } = require('./services/messaging');
const SupabaseQueueService = require('./services/queue/supabaseQueueService');

const app = express();

app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));
app.use(express.json());
app.use(requestLogger);
app.use('/api', webhookRouter);

async function checkAndRestartBot(bot, botType) {
  if (!bot.isRunning()) {
    logger.warn(`${botType} bot is not running. Attempting to restart...`);
    try {
      await bot.restart();
      logger.info(`${botType} bot restarted successfully`);
    } catch (error) {
      logger.error(`Error restarting ${botType} bot:`, error);
    }
  } else if (bot.getPollingError()) {
    logger.warn(`${botType} bot has a polling error. Attempting to restart...`);
    try {
      await bot.restart();
      logger.info(`${botType} bot restarted successfully`);
    } catch (error) {
      logger.error(`Error restarting ${botType} bot:`, error);
    }
  }
}

async function checkApplicationState() {
  await Promise.all([
    checkAndRestartBot(userBot, 'User'),
    checkAndRestartBot(adminBot, 'Admin'),
    checkAndRestartBot(notificationBot, 'Notification')
  ]);
}

async function processUnfinishedTasks() {
  logger.info('Processing unfinished tasks...');
  
  // Process pending messages from the conversation states
  await processPendingMessages().catch(error => {
    logger.error('Error processing pending messages:', error);
  });

  // Process unfinished queue items
  const unprocessedItems = await SupabaseQueueService.getUnprocessedItems();
  for (const item of unprocessedItems) {
    try {
      logger.info(`Processing queue item ${item.id} with  campaign_id ${item.campaign_id}`);
      await messageMailingService.processQueue(item); // Changed from processQueueItem to processQueue
    } catch (error) {
      logger.error(`Error processing queue item ${item.id}:`, error);
    }
  }

  logger.info('Unfinished tasks processed');
}

async function main() {
  try {
    logger.info('Main function started');

    // Инициализация сессий Telegram
    await retryOperation(
      async () => {
        await TelegramSessionService.initializeSessions();
      },
      3,
      5000,
    );

    // Инициализация WhatsApp сессий
    WhatsAppSessionService.onMessage(async (message, phoneNumber) => {
      try {
        await handleMessageService.processIncomingMessage(
          phoneNumber,
          message,
          'whatsapp',
        );
      } catch (error) {
        logger.error(`Error processing WhatsApp message: ${error.message}`);
      }
    });

    // Инициализация ботов
    logger.info('Initializing bots...');
    await Promise.all([
      retryOperation(async () => adminBot.launch(), 3, 5000),
      retryOperation(async () => userBot.launch(), 3, 5000),
      retryOperation(async () => notificationBot.launch(), 3, 5000),
    ]);
    logger.info('Bots initialized and polling started');

    // Обработка незавершенных сообщений при запуске
    logger.info('Processing pending messages...');
    await processPendingMessages().catch(console.error);
    logger.info('Pending messages processed');

    // Обрабока очереди сообщений  
    logger.info('Processing message queue...');
    messageMailingService.processQueue().catch(error => {
      logger.error('Error processing message queue:', error);
    });
    logger.info('Message queue processed');


    // Настройка Express
    app.get('/', (req, res) => {
      res.send('Magic Chat server is running');
    });

    // Запуск Express сервера
    const port = config.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Запуск периодической проверки состояния ботов
    setInterval(checkApplicationState, 5 * 60 * 1000); // Проверка каждые 5 минут

    // Функция корректного завершения работы
    async function gracefulShutdown() {
      logger.info('Graceful shutdown initiated');

      server.close(() => {
        logger.error('HTTP server closed');
      });

      await Promise.all([
        adminBot.stop().catch(error => logger.error('Error stopping admin bot:', error)),
        userBot.stop().catch(error => logger.error('Error stopping user bot:', error)),
        notificationBot.stop().catch(error => logger.error('Error stopping notification bot:', error)),
        TelegramSessionService.disconnectAllSessions().catch(error => logger.error('Error disconnecting Telegram sessions:', error)),
        ...Array.from(WhatsAppSessionService.clients.keys()).map(phoneNumber => 
          WhatsAppSessionService.disconnectSession(phoneNumber).catch(error => logger.error(`Error disconnecting WhatsApp session for ${phoneNumber}:`, error))
        )
      ]);

      logger.info('All services stopped');

      if (typeof global.releaseLock === 'function') {
        global.releaseLock();
      }

      process.exit(0);
    }

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise);
      logger.error('Reason:', reason);
    });

    // Обработка сигналов завершения
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Планирование ежедневного сброса статистики
    logger.info('Scheduling daily stats reset...');
    cron.schedule('0 0 * * *', async () => {
      try {
        await phoneNumberService.resetDailyStats();
        await processPendingMessages();
        logger.info('Daily stats reset completed');
      } catch (error) {
        logger.error('Error during daily stats reset:', error);
      }
    });
    logger.info('Daily stats reset scheduled');

    // Process unfinished tasks before starting the server
    await processUnfinishedTasks();

  } catch (error) {
    logger.error('Error in main function:', error);
    throw error;
  }
}


module.exports = { main, app };