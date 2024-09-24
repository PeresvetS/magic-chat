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
      mailing: rabbitMQ.mailingQueue || 'mailing',
      messaging: rabbitMQ.messagingQueue || 'messaging',
    };
  }

  async connect() {
    try {
      logger.info(`Connecting to RabbitMQ... rabbitMQ.url: ${rabbitMQ.url}`);
      this.connection = await amqp.connect(rabbitMQ.url, {
        heartbeat: rabbitMQ.heartbeat,
      });
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queues.mailing, { durable: true });
      await this.channel.assertQueue(this.queues.messaging, { durable: true });
      await this.channel.prefetch(rabbitMQ.prefetch);
      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Ошибка подключения к RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('Disconnected from RabbitMQ');
    } catch (error) { 
      logger.error('Ошибка отключения от RabbitMQ:', error);
      throw error;
    }
  }

  async enqueue(queueName, data) {
    logger.info(`Enqueuing item to ${queueName} queue`);
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel.assertQueue(this.queues[queueName], { durable: true });

      const queueItem = await rabbitMQQueueRepo.createQueueItem({
        ...data,
        status: 'pending',
      });

      this.channel.sendToQueue(
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
    logger.info(`Dequeuing item from ${queueName} queue`);
    try {
      if (!this.channel) {
        await this.connect();
      }

      const message = await this.channel.get(this.queues[queueName], { noAck: false });
      if (!message) {
        return null;
      }

      const messageId = message.content.toString();
      const queueItem = await this.getQueueItem(parseInt(messageId, 10));

      if (!queueItem) {
        logger.warn(`Queue item with id ${messageId} not found in DB`);
        this.channel.ack(message); // Acknowledge message to remove it from the queue
        return null;
      }

      // Attach ack and nack functions for later use
      queueItem.ackFunction = () => this.channel.ack(message);
      queueItem.nackFunction = () => this.channel.nack(message);

      return queueItem;
    } catch (error) {
      logger.error(`Error dequeuing item from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Новый метод для событийно-ориентированного потребления сообщений
   * @param {string} queueName - Название очереди
   * @param {function} onMessageCallback - Функция-обработчик сообщения
   */
  async startConsuming(queueName, onMessageCallback) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      await this.channel.consume(this.queues[queueName], async (message) => {
        if (message !== null) {
          const messageId = message.content.toString();
          const queueItem = await this.getQueueItem(parseInt(messageId, 10));

          if (!queueItem) {
            logger.warn(`Queue item with id ${messageId} not found in DB`);
            this.channel.ack(message); // Убираем сообщение из очереди
            return;
          }

          // Передаём queueItem и сообщение в коллбэк для обработки
          await onMessageCallback(queueItem, message);
        }
      }, { noAck: false });

      logger.info(`Started consuming messages from ${queueName} queue`);
    } catch (error) {
      logger.error(`Error starting consumer for queue ${queueName}:`, error);
      throw error;
    }
  }

  async markAsCompleted(queueItem, result) {
    try {
      const updatedItem = await rabbitMQQueueRepo.updateQueueItem(queueItem.id, {
        status: 'completed',
        result: JSON.stringify(result),
        updatedAt: new Date(),
      });
      if (updatedItem.status !== 'completed') {
        logger.warn(`Failed to mark queue item ${queueItem.id} as completed`);
      }
      logger.info(`Queue item ${queueItem.id} marked as completed`);
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

      // Добавим дополнительную проверку и обработку статуса
      if (item.status === 'completed' && item.result) {
        try {
          item.result = JSON.parse(item.result);
        } catch (e) {
          logger.warn(`Failed to parse result for queue item ${id}`, e);
        }
      }

      return item;
    } catch (error) {
      logger.error(`Error getting queue item with id ${id}:`, error);
      throw error;
    }
  }

  async updateQueueItemStatus(id, status, result) {
    try {
      await rabbitMQQueueRepo.updateQueueItem(id, {
        status,
        result: JSON.stringify(result),
        updatedAt: new Date(),
      });
      logger.info(`Queue item ${id} status updated to ${status}`);
    } catch (error) {
      logger.error(`Error updating queue item ${id} status:`, error);
      throw error;
    }
  }
}

module.exports = new RabbitMQQueueService();