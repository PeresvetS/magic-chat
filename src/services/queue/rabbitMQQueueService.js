// src/services/queue/rabbitMQQueueService.js

const amqp = require('amqplib');
const rabbitMQQueueRepo = require('../../db/repositories/rabbitMQQueueRepo');
const logger = require('../../utils/logger');
const { rabbitMQ } = require('../../db/utils/config');

class RabbitMQQueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queueName = rabbitMQ.queue;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(rabbitMQ.url, {
        heartbeat: rabbitMQ.heartbeat,
      });
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.prefetch(rabbitMQ.prefetch);
    } catch (error) {
      logger.error('Ошибка подключения к RabbitMQ:', error);
      throw error;
    }
  }

  async enqueue(campaignId, message, recipientPhoneNumber, platform, senderPhoneNumber, additionalData = {}) {
    try {
      if (!this.channel) await this.connect();

      const queueItem = await rabbitMQQueueRepo.createQueueItem({
        campaignId,
        message,
        recipientPhoneNumber,
        platform,
        senderPhoneNumber,
        status: 'pending',
        additionalData: additionalData ? JSON.stringify(additionalData) : null,
      });

      await this.channel.sendToQueue(this.queueName, Buffer.from(queueItem.id.toString()), { persistent: true });

      return queueItem;
    } catch (error) {
      logger.error('Ошибка добавления сообщения в очередь:', error);
      throw error;
    }
  }

  async dequeue() {
    try {
      if (!this.channel) await this.connect();

      const message = await this.channel.get(this.queueName, { noAck: false });
      if (!message) return null;

      const queueItemId = parseInt(message.content.toString());
      const queueItem = await rabbitMQQueueRepo.findQueueItem(queueItemId);

      if (!queueItem) {
        this.channel.ack(message);
        return null;
      }

      await rabbitMQQueueRepo.updateQueueItem(queueItemId, { status: 'processing' });

      return {
        ...queueItem,
        ackFunction: () => this.channel.ack(message),
        nackFunction: () => this.channel.nack(message)
      };
    } catch (error) {
      logger.error('Ошибка извлечения сообщения из очереди:', error);
      throw error;
    }
  }

  async markAsCompleted(queueItem, result) {
    try {
      await rabbitMQQueueRepo.updateQueueItem(queueItem.id, {
        status: 'completed',
        result: JSON.stringify(result),
        updatedAt: new Date()
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
      await rabbitMQQueueRepo.updateQueueItem(queueItem.id, {
        status: 'failed',
        errorMessage,
        updatedAt: new Date()
      });
      queueItem.nackFunction();
      logger.info('Сообщение помечено как необработанное и возвращено в очередь');
    } catch (error) {
      logger.error('Ошибка при отклонении сообщения:', error);
      throw error;
    }
  }

  async getUnprocessedItems() {
    try {
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