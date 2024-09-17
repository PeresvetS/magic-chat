// src/services/queue/supabaseQueueService.js

const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

class SupabaseQueueService {
  async enqueue(campaignId, message, recipientPhoneNumber, platform, senderPhoneNumber, additionalData = {}) {
    try {
      const data = await prisma.messageQueue.create({
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
      return data;
    } catch (error) {
      logger.error('Error enqueueing message:', error);
      throw error;
    }
  }

  async dequeue() {
    try {
      const data = await prisma.messageQueue.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' }
      });

      if (!data) return null;

      await prisma.messageQueue.update({
        where: { id: data.id },
        data: { status: 'processing' }
      });

      return data;
    } catch (error) {
      logger.error('Error dequeuing message:', error);
      throw error;
    }
  }

  async markAsCompleted(id, result) {
    try {
      const data = await prisma.messageQueue.update({
        where: { id },
        data: { 
          status: 'completed', 
          result 
        }
      });
      return data;
    } catch (error) {
      logger.error('Error marking message as completed:', error);
      throw error;
    }
  }

  async markAsFailed(id, errorMessage) {
    try {
      const data = await prisma.messageQueue.update({
        where: { id },
        data: { 
          status: 'failed', 
          errorMessage 
        }
      });
      return data;
    } catch (error) {
      logger.error('Error marking message as failed:', error);
      throw error;
    }
  }

  async getQueueItem(id) {
    try {
      return await prisma.messageQueue.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Error getting queue item:', error);
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
      logger.error('Error getting unprocessed queue items:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseQueueService();