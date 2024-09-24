// src/workers/messageQueueWorker.js

const { isMainThread, parentPort } = require('worker_threads');
const { sendQueuedMessages } = require('../services/messaging/src/messageSender');
const logger = require('../utils/logger');
const RabbitMQQueueService = require('../services/queue/rabbitMQQueueService');

async function startWorker() {
  try {
    logger.info('Starting message queue worker');
    
    // Подключение к RabbitMQ (если еще не подключено)
    await RabbitMQQueueService.connect();
    
    // Запуск обработки очереди сообщений
    await sendQueuedMessages();
  } catch (error) {
    logger.error('Error in message queue worker:', error);
    if (isMainThread) {
      process.exit(1);
    } else {
      parentPort.postMessage({ type: 'error', error: error.message });
    }
  }
}

if (isMainThread) {
  startWorker();
} else {
  parentPort.on('message', (message) => {
    if (message === 'start') {
      startWorker();
    }
  });
}