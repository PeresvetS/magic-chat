// src/db/repositories/messageRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveMessage(leadId, userRequest, assistantResponse, userId) {
  try {
    return await prisma.message.create({
      data: {
        dialog: {
          connectOrCreate: {
            where: { leadId },
            create: { 
              leadId,
              userId,
              contactId: leadId.toString(), // Используем leadId как contactId
              platform: 'default' // Добавьте соответствующую платформу или передайте ее как параметр
            },
          },
        },
        userRequest,
        assistantResponse,
      },
    });
  } catch (error) {
    logger.error(`Error saving message: ${error.message}`);
    throw error;
  }
}

async function getRecentMessages(leadId, limit = 10) {
  try {
    return await prisma.message.findMany({
      where: { dialog: { leadId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    logger.error(`Error getting recent messages: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveMessage,
  getRecentMessages,
};
