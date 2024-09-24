// src/db/repositories/messageRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveMessage(dialogId, userRequest, data) {
  try {
    return await prisma.message.create({
      data: {
        ...data,
        userRequest,
        dialog: { 
          connect: { 
            id: dialogId
          } 
        },
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

async function updateMessage(messageId, data) {
  try {
    return await prisma.message.update({
      where: { id: messageId },
      data,
    });
  } catch (error) {
    logger.error(`Error updating message: ${error.message}`);
    throw error;
  }
}

async function getAllMessages(leadId) {
  try {
    return await prisma.message.findMany({
      where: { dialog: { leadId } },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    logger.error(`Error getting all messages: ${error.message}`);
    throw error;
  }
}

async function findMessageByCampaignAndRecipient(campaignId, leadId) {
  try {
    return await prisma.message.findFirst({
      where: { dialog: { campaignId, leadId } },
    });
  } catch (error) {
    logger.error(`Error finding message by campaign and recipient: ${error.message}`);
    throw error;
  }
}

async function findOrCreateDialog(leadId, userId, contactId, platform) {
  return await prisma.dialog.upsert({
    where: {
      leadId: leadId,
    },
    update: {},
    create: {
      leadId: leadId,
      userId: userId,
      contactId: contactId,
      platform: platform,
    },
  });
}


module.exports = {
  saveMessage,
  getRecentMessages,
  getAllMessages,
  updateMessage,
  findMessageByCampaignAndRecipient,
  findOrCreateDialog,
};
