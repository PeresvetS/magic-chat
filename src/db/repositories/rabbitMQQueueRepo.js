// src/db/repositories/rabbitMQQueueRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

class RabbitMQQueueRepo {
  async createQueueItem(data) {
    try {
      if (!data.leadId) {
        return await prisma.messageQueue.create({ data });
      }
      const { leadId, ...restData } = data;
      return await prisma.messageQueue.create({ 
        data: { ...restData, lead: { connect: { id: leadId } } }, 
      });
    } catch (error) {
      logger.error('Ошибка создания элемента очереди:', error);
      throw error;
    }
  }

  async findQueueItem(id) {
    try {
      return await prisma.messageQueue.findUnique({ where: { id } });
    } catch (error) {
      logger.error(`Ошибка поиска элемента очереди с id ${id}:`, error);
      throw error;
    }
  }

  async updateQueueItem(id, data) {
    try {
      if (!id) {
        throw new Error('Invalid queue item id');
      }
      return await prisma.messageQueue.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error(`Ошибка обновления элемента очереди с id ${id}:`, error);
      throw error;
    }
  }

  async getUnprocessedItems() {
    try {
      return await prisma.messageQueue.findMany({
        where: {
          status: {
            in: ['pending', 'processing'],
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      logger.error('Ошибка получения необработанных элементов очереди:', error);
      throw error;
    }
  }
}

module.exports = new RabbitMQQueueRepo();
