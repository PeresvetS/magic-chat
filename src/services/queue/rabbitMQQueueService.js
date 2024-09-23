// src/services/queue/rabbitMQQueueService.js

const amqp = require('amqplib');

const { rabbitMQQueueRepo } = require('../../db');
const logger = require('../../utils/logger');
const { rabbitMQ } = require('../../db/utils/config');

class RabbitMQQueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = {
      incoming: rabbitMQ.incomingQueue,
      outgoing: rabbitMQ.outgoingQueue
    };
  }

  async connect() {
    try {
      logger.info(`Connecting to RabbitMQ... rabbitMQ.url: ${rabbitMQ.url}`);
      this.connection = await amqp.connect(rabbitMQ.url, {
        heartbeat: rabbitMQ.heartbeat,
      });
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queues.incoming, { durable: true });
      await this.channel.prefetch(rabbitMQ.prefetch);
    } catch (error) {
      logger.error('Ошибка подключения к RabbitMQ:', error);
      throw error;
    }
  }

  async enqueue(queueName, data) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel.assertQueue(this.queues[queueName], { durable: true });

      const queueItem = await rabbitMQQueueRepo.createQueueItem({
        ...data,
        status: 'pending',
      });

      await this.channel.sendToQueue(
        this.queues[queueName],
        Buffer.from(queueItem.id.toString()),
        { persistent: true },
      );

      logger.info(
        `Enqueued item for ${queueName} queue with id ${queueItem.id}`,
      );
      return queueItem;
    } catch (error) {
      logger.error(`Ошибка добавления элемента в очередь ${queueName}:`, error);
      throw error;
    }
  }

  async dequeue(queueName) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = await this.channel.get(this.queues[queueName], { noAck: false });
      if (!message) {
        return null;
      }

      // ... (остальной код остается без изменений)
    } catch (error) {
      logger.error(`Ошибка извлечения элемента из очереди ${queueName}:`, error);
      throw error;
    }
  }

  async markAsCompleted(queueItem, result) {
    try {
      await rabbitMQQueueRepo.updateQueueItem(queueItem.id, {
        status: 'completed',
        result: JSON.stringify(result),
        updatedAt: new Date(),
      });
      queueItem.ackFunction();
      logger.info('Сообщение успешно обработано и подтверждено');
    } catch (error) {
      logger.error('Ошибка при подтверждении сообщения:', error);
      throw error;
    }
  }

  async markAsFailed(queueItem, errorMessage) {
    try {
      if (!queueItem || !queueItem.id) {
        logger.error('Invalid queue item or missing id:', queueItem);
        return;
      }

      const updatedItem = await rabbitMQQueueRepo.updateQueueItem(
        queueItem.id,
        {
          status: 'failed',
          errorMessage,
          retryCount: (queueItem.retryCount || 0) + 1,
          updatedAt: new Date(),
        },
      );

      if (updatedItem.retryCount >= 5) {
        logger.warn(
          `Queue item ${queueItem.id} has reached maximum retry attempts. Removing from queue.`,
        );
        queueItem.ackFunction(); // Удаляем из очереди
      } else {
        queueItem.nackFunction(); // Возвращаем в очередь для повторной попытки
        logger.info(
          `Message marked as failed and returned to queue. Retry attempt: ${updatedItem.retryCount}`,
        );
      }
    } catch (error) {
      logger.error('Ошибка при обработке неудачного сообщения:', error);
    }
  }

  async getUnprocessedItems() {
    try {
      if (typeof rabbitMQQueueRepo.getUnprocessedItems !== 'function') {
        throw new Error(
          'getUnprocessedItems is not defined in rabbitMQQueueRepo',
        );
      }
      return await rabbitMQQueueRepo.getUnprocessedItems();
    } catch (error) {
      logger.error('Ошибка получения необработанных элементов очереди:', error);
      throw error;
    }
  }

  async getQueueItem(id) {
    try {
      const item = await rabbitMQQueueRepo.findQueueItem(parseInt(id));

      if (!item) {
        logger.warn(`Queue item with id ${id} not found`);
        return null;
      }

      return item;
    } catch (error) {
      logger.error(`Error getting queue item with id ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new RabbitMQQueueService();
