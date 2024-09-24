// src/workers/messageQueueWorker.js

const { isMainThread, parentPort } = require('worker_threads');
const { sendQueuedMessages } = require('../services/messaging/src/messageSender');
const logger = require('../utils/logger');
const RabbitMQQueueService = require('../services/queue/rabbitMQQueueService');

async function handleMessage(queueItem, message) {
  try {
    logger.info(`Processing queue item ${queueItem.id} with campaignId ${queueItem.campaignId}`);

    await sendQueuedMessages(queueItem); // Обработка сообщения

    // Подтверждаем обработку сообщения
    await RabbitMQQueueService.markAsCompleted(queueItem, { status: 'sent' });
    RabbitMQQueueService.channel.ack(message);
    logger.info(`Successfully processed queue item ${queueItem.id}`);
  } catch (error) {
    logger.error(`Error processing queue item ${queueItem.id}:`, error);
    await RabbitMQQueueService.markAsFailed(queueItem, error.message);
    RabbitMQQueueService.channel.nack(message); // Возвращаем сообщение в очередь для повторной обработки
  }
}

async function startWorker() {
  try {
    logger.info('Starting message queue worker');

    // Подключение к RabbitMQ (если еще не подключено)
    await RabbitMQQueueService.connect();

    // Запуск потребления сообщений из очереди 'messaging'
    await RabbitMQQueueService.startConsuming('messaging', handleMessage);

    logger.info('Message queue worker is now consuming messages');
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