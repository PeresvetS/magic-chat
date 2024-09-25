// src/main.js

const path = require('path');
const cron = require('node-cron');
const express = require('express');
const bodyParser = require('body-parser');

const config = require('./config');
const userBot = require('./bot/user');
const adminBot = require('./bot/admin');
const { Worker } = require('worker_threads');
const logger = require('./utils/logger');
const { retryOperation } = require('./utils/helpers');
const webhookRouter = require('./api/routes/webhooks');
const { phoneNumberService } = require('./services/phone');
const { messageQuequeService } = require('./services/mailing');
const requestLogger = require('./api/middleware/requestLogger');
const { WhatsAppSessionService } = require('./services/whatsapp');
const { TelegramSessionService } = require('./services/telegram');
const notificationBot = require('./bot/notification/notificationBot');
const {
  handleMessageService,
  processPendingMessages,
} = require('./services/messaging');
const RabbitMQQueueService = require('./services/queue/rabbitMQQueueService');

let isProcessingUnfinishedTasks = false;

const app = express();

app.use(bodyParser.raw({ type: 'application/x-www-form-urlencoded' }));
app.use(express.json());
app.use(requestLogger);
app.use('/api', webhookRouter);

async function checkAndRestartBot(bot, botType) {
  try {
    if (!bot.isRunning()) {
      logger.warn(`${botType} bot is not running. Attempting to restart...`);
      await bot.stop();
      await new Promise(resolve => setTimeout(resolve, 5000));
      await bot.restart();
      logger.info(`${botType} bot restarted successfully`);
    } else if (bot.getPollingError()) {
      logger.warn(`${botType} bot has a polling error. Attempting to restart...`);
      await bot.restart();
      logger.info(`${botType} bot restarted successfully`);
    }
  } catch (error) {
    logger.error(`Error restarting ${botType} bot:`, error);
    // Не позволяем ошибке "всплыть" выше
  }
}

async function checkApplicationState() {
  await Promise.all([
    checkAndRestartBot(userBot, 'User'),
    checkAndRestartBot(adminBot, 'Admin'),
    checkAndRestartBot(notificationBot, 'Notification'),
  ]);
}

async function processUnfinishedTasks() {
  logger.info('Processing unfinished tasks...');

  if (isProcessingUnfinishedTasks) {
    logger.info('Already processing unfinished tasks. Skipping.');
    return;
  }
  isProcessingUnfinishedTasks = true;

  try {
    await processPendingMessages();

    const unprocessedItems = await RabbitMQQueueService.getUnprocessedItems();
    for (const item of unprocessedItems) {
      if (item && item.id && item.campaignId) {
        logger.info(
          `Processing queue item ${item.id} with campaignId ${item.campaignId}`,
        );
        await messageQuequeService.processQueue(item);
      } else {
        logger.warn('Skipping invalid queue item:', item);
      }
    }
  } catch (error) {
    logger.error('Error processing unfinished tasks:', error);
  } finally {
    isProcessingUnfinishedTasks = false;
  }

  logger.info('Unfinished tasks processed');
}

let isProcessingQueue = false;

async function startMessageQueueProcessing() {
  await RabbitMQQueueService.startConsuming('mailing', async (queueItem) => {
    try {
      await messageQuequeService.processSingleQueueItem(queueItem);
    } catch (error) {
      logger.error(`Error processing queue item ${queueItem.id}:`, error);
    }
  });
}

async function startMessageQueueWorker() {
  let retryCount = 0;
  const maxRetries = 5;
  const initialDelay = 1000; // 1 second

  const startWorker = () => {
    const workerPath = path.resolve(__dirname, 'workers/messageQueueWorker.js');
    lo
    const worker = new Worker(path.resolve(__dirname, workerPath));

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      handleWorkerError();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        handleWorkerError();
      }
    });

    worker.on('message', (message) => {
      logger.info('Message from worker:', message);
    });

    // Отправляем сообщение воркеру для запуска
    worker.postMessage('start');
  };

  const handleWorkerError = () => {
    if (retryCount < maxRetries) {
      retryCount++;
      const delay = initialDelay * Math.pow(2, retryCount - 1);
      console.log(`Restarting worker in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
      setTimeout(startWorker, delay);
    } else {
      console.error('Max retry attempts reached. Worker will not be restarted.');
      // Здесь можно добавить од для уведомления разработчиков или администраторов
    }
  };

  startWorker();
}

async function main() {
  try {
    logger.info('Main function started');

    // Инициализация RabbitMQ
    try {
      await RabbitMQQueueService.connect();
      logger.info('Successfully connected to RabbitMQ');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      // Возможно, стоит добавить повторные попытки подключения или завершить процесс
    }

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
    try {
      await Promise.all([
        retryOperation(async () => userBot.launch(), 3, 5000),
        retryOperation(async () => notificationBot.launch(), 3, 5000),
        retryOperation(async () => adminBot.launch(), 3, 5000),
      ]);
      logger.info('Bots initialized and polling started');
    } catch (error) {
      logger.error('Error initializing bots:', error);
    }

    // Обработка незавершенных задач при запуске
    logger.info('Processing unfinished tasks...');
    await processUnfinishedTasks();
    logger.info('Unfinished tasks processed');

    // Запуск постоянной обработки очереди сообщений
    logger.info('Starting continuous message queue processing...');
    await startMessageQueueProcessing();
    logger.info('Message queue processed');

    // Настройка Express
    app.get('/', (req, res) => {
      res.send('Magic Chat server is running');
    });

    // Запуск Express сервера
    const port = config.PORT || 3000;
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please choose a different port or stop the process using this port.`);
      } else {
        logger.error('Error starting server:', error);
      }
      // process.exit(1);
    });

    // Запуск периодической проверки состояния ботов
    setInterval(checkApplicationState, 5 * 60 * 1000); // Проверка каждые 5 минут

    // Функция корректного завершения работы
    async function gracefulShutdown() {
      logger.info('Graceful shutdown initiated');

      // Остановка обработки очереди сообщений
      isProcessingQueue = false;

      // Остановка Express сервера
      server.close(() => {
        logger.error('HTTP server closed');
      });

      await Promise.all([
        adminBot
          .stop()
          .catch((error) => logger.error('Error stopping admin bot:', error)),
        userBot
          .stop()
          .catch((error) => logger.error('Error stopping user bot:', error)),
        notificationBot
          .stop()
          .catch((error) =>
            logger.error('Error stopping notification bot:', error),
          ),
        TelegramSessionService.disconnectAllSessions().catch((error) =>
          logger.error('Error disconnecting Telegram sessions:', error),
        ),
        RabbitMQQueueService.disconnect(), // Доавьте метод отключения от RabbitMQ
        ...Array.from(WhatsAppSessionService.clients.keys()).map(
          (phoneNumber) =>
            WhatsAppSessionService.disconnectSession(phoneNumber).catch(
              (error) =>
                logger.error(
                  `Error disconnecting WhatsApp session for ${phoneNumber}:`,
                  error,
                ),
            ),
        ),
      ]);

      logger.info('All services stopped');

      if (typeof global.releaseLock === 'function') {
        global.releaseLock();
      }

      // Добавьте небольшую задержку перед выходом
      await new Promise(resolve => setTimeout(resolve, 2000));

      process.exit(0);
    }

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise);
      logger.error('Reason:', reason);
    });

    // Обработка сигалов завершения
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
    // await processUnfinishedTasks();

    // Запуск воркера череди сообщений
    // await startMessageQueueWorker();
  } catch (error) {
    logger.error('Error in main function:', error);
    throw error;
  }
}

main().catch((error) => {
  logger.error('Unhandled error in main function:', error);
  process.exit(1);
});

module.exports = { main, app };
