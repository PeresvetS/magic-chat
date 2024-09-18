// src/services/queue/rabbitMQQueueService.js

const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class RabbitMQQueueService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queueName = 'messageQueue';
  }

  async connect() {
    try {
      this.connection = await amqp.connect('amqp://localhost');
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
    } catch (error) {
      logger.error('Ошибка подключения к RabbitMQ:', error);
      throw error;
    }
  }

  async enqueue(campaignId, message, recipientPhoneNumber, platform, senderPhoneNumber, additionalData = {}) {
    try {
      if (!this.channel) await this.connect();

      // Сохраняем сообщение в базу данных
      const queueItem = await prisma.messageQueue.create({
        data: {
          campaignId,
          message,
          recipientPhoneNumber,
          platform,
          senderPhoneNumber,
          status: 'pending',
          additionalData: additionalData ? JSON.stringify(additionalData) : null,
        }
      });

      // Отправляем ID сообщения в RabbitMQ
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
      const queueItem = await prisma.messageQueue.findUnique({ where: { id: queueItemId } });

      if (!queueItem) {
        this.channel.ack(message);
        return null;
      }

      await prisma.messageQueue.update({
        where: { id: queueItemId },
        data: { status: 'processing' }
      });

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
      await prisma.messageQueue.update({
        where: { id: queueItem.id },
        data: { 
          status: 'completed', 
          result: JSON.stringify(result),
          updatedAt: new Date()
        }
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
      await prisma.messageQueue.update({
        where: { id: queueItem.id },
        data: { 
          status: 'failed', 
          errorMessage,
          updatedAt: new Date()
        }
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
      return await prisma.messageQueue.findMany({
        where: {
          status: {
            in: ['pending', 'processing']
          }
        },
        orderBy: { createdAt: 'asc' }
      });
    } catch (error) {
      logger.error('Ошибка получения необработанных элементов очереди:', error);
      throw error;
    }
  }

  async getQueueItem(id) {
    try {
      const item = await prisma.messageQueue.findUnique({
        where: { id: parseInt(id) }
      });

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