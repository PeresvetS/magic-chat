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

  async reconnect() {
    try {
      await this.disconnect();
      await this.connect();
    } catch (error) {
      logger.error('Failed to reconnect to RabbitMQ:', error);
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

      // Log the data being enqueued
      logger.debug(`Enqueueing data: ${JSON.stringify(data)}`);

      const queueItem = await rabbitMQQueueRepo.createQueueItem({
        ...data,
        status: 'pending',
      });

      // Send only the ID to the queue
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
      logger.error(`Error adding item to queue ${queueName}:`, error);
      // Log additional details about the error
      if (error instanceof SyntaxError) {
        logger.error('JSON parsing error. Invalid data format.');
      }
      if (error.code) {
        logger.error(`Error code: ${error.code}`);
      }
      throw error;
    }
  }

  async dequeue(queueName) {
    try {
      if (!this.isChannelOpen()) {
        await this.reconnect();
      }

      const message = await this.channel.get(this.queues[queueName], { noAck: false });
      if (!message) {
        return null;
      }

      const messageId = message.content.toString();
      const queueItem = await this.getQueueItem(parseInt(messageId, 10));

      if (!queueItem) {
        logger.warn(`Queue item with id ${messageId} not found in DB`);
        await this.channel.ack(message);
        return null;
      }

      const channelRef = this.channel;
      queueItem.ackFunction = async () => {
        try {
          if (this.isChannelOpen() && channelRef === this.channel) {
            await channelRef.ack(message);
            logger.info(`Message ${messageId} acknowledged successfully`);
          } else {
            logger.warn('Channel closed or changed, skipping ack');
          }
        } catch (error) {
          logger.error(`Error acknowledging message ${messageId}:`, error);
        }
      };
      queueItem.nackFunction = async () => {
        try {
          if (this.isChannelOpen() && channelRef === this.channel) {
            await channelRef.nack(message);
            logger.info(`Message ${messageId} negative acknowledged successfully`);
          } else {
            logger.warn('Channel closed or changed, skipping nack');
          }
        } catch (error) {
          logger.error(`Error negative acknowledging message ${messageId}:`, error);
        }
      };

      return queueItem;
    } catch (error) {
      logger.error(`Error dequeuing item from queue ${queueName}:`, error);
      if (error.code === 'ECONNRESET' || error.message.includes('channel closed')) {
        await this.reconnect();
      }
      throw error;
    }
  }

  /**
   * Новый метод для событино-ориентированного потребления сообщений
   * @param {string} queueName - Название очереди
   * @param {function} onMessageCallback - Функция-обработчик сообщения
   */
  async startConsuming(queueName, onMessageCallback) {
    try {
      await this.channel.prefetch(1);
      await this.channel.consume(queueName, async (msg) => {
        if (msg === null) {
          return;
        }
        
        const messageId = msg.content.toString();
        const queueItem = await this.getQueueItem(parseInt(messageId, 10));

        if (!queueItem) {
          logger.warn(`Queue item with id ${messageId} not found in DB`);
          await this.channel.ack(msg);
          return;
        }

        // Проверяем, не обрабатывается ли уже это сообщение
        if (queueItem.status === 'processing') {
          logger.warn(`Queue item ${messageId} is already being processed. Skipping.`);
          await this.channel.ack(msg);
          return;
        }

        // Помечаем сообщение как обрабатываемое
        await this.updateQueueItemStatus(queueItem.id, 'processing');

        try {
          await onMessageCallback(queueItem);
          await this.updateQueueItemStatus(queueItem.id, 'completed');
          await this.channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing message: ${error.message}`);
          await this.updateQueueItemStatus(queueItem.id, 'failed', { error: error.message });
          await this.channel.nack(msg, false, true);
        }
      }, { noAck: false });
      
      logger.info(`Started consuming messages from queue: ${queueName}`);
    } catch (error) {
      logger.error(`Error starting to consume messages from queue ${queueName}:`, error);
      throw error;
    }
  }

  async markAsCompleted(queueItem, result) {
    try {
      await this.updateQueueItemStatus(queueItem.id, 'completed', result);
      logger.info(`Queue item ${queueItem.id} marked as completed`);
    } catch (error) {
      logger.error(`Error marking queue item ${queueItem.id} as completed:`, error);
    }
  }

  async markAsFailed(queueItem, errorMessage) {
    try {
      if (!queueItem || !queueItem.id) {
        logger.error('Invalid queue item or missing id:', queueItem);
        return;
      }
  
      const updatedItem = await rabbitMQQueueRepo.updateQueueItem(queueItem.id, {
        status: 'failed',
        errorMessage,
        retryCount: (queueItem.retryCount || 0) + 1,
        updatedAt: new Date(),
      });
  
      if (updatedItem.retryCount >= 5) {
        logger.warn(
          `Queue item ${queueItem.id} has reached maximum retry attempts. Removing from queue.`,
        );
        if (queueItem.ackFunction && typeof queueItem.ackFunction === 'function') {
          queueItem.ackFunction(); // Acknowledge to remove from queue
        } else {
          logger.warn('No ackFunction available for queue item:', queueItem);
        }
      } else {
        if (queueItem.nackFunction && typeof queueItem.nackFunction === 'function') {
          queueItem.nackFunction(); // Return to queue for retry
        } else {
          logger.warn('No nackFunction available for queue item:', queueItem);
        }
        logger.info(
          `Message marked as failed and returned to queue. Retry attempt: ${updatedItem.retryCount}`,
        );
      }
    } catch (error) {
      logger.error('Error handling failed message:', error);
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

  isChannelOpen() {
    return this.channel && this.channel.connection && this.channel.connection.stream && !this.channel.connection.stream.destroyed;
  }

  isConnected() {
    return this.connection !== null && 
           this.channel !== null && 
           this.connection.connection !== null &&
           this.connection.connection.stream !== null &&
           !this.connection.connection.stream.destroyed;
  }
}

module.exports = new RabbitMQQueueService();