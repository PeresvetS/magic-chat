// src/workers/messageQueueWorker.js

const { isMainThread, parentPort } = require('worker_threads');
const { sendQueuedMessages } = require('../services/messaging/src/messageSender');
const logger = require('../utils/logger');
const RabbitMQQueueService = require('../services/queue/rabbitMQQueueService');


// src/workers/messageQueueWorker.js

async function handleMessage(queueItem, message) {
  try {
    logger.info(`Processing queue item ${queueItem.id} with campaignId ${queueItem.campaignId}`);

    await sendQueuedMessages(queueItem); // Processing the message

    // Acknowledge message processing within RabbitMQQueueService
    await RabbitMQQueueService.markAsCompleted(queueItem, { status: 'sent' });
    // No direct acknowledgment here
    logger.info(`Successfully processed queue item ${queueItem.id}`);
  } catch (error) {
    logger.error(`Error processing queue item ${queueItem.id}:`, error);
    await RabbitMQQueueService.markAsFailed(queueItem, error.message);
    // No direct nack here
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