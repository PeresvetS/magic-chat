// src/services/dialog/messageService.js

const { messageRepo } = require('../../db');
const logger = require('../../utils/logger');

async function saveMessage(dialogId, userRequest, data) {
  try {
    return await messageRepo.saveMessage(dialogId, userRequest, data);
  } catch (error) {
    logger.error(`Error in messageService.saveMessage: ${error.message}`);
    throw error;
  }
}

async function getRecentMessages(leadId, limit = 10) {
  try {
    return await messageRepo.getRecentMessages(leadId, limit);
  } catch (error) {
    logger.error(`Error in messageService.getRecentMessages: ${error.message}`);
    throw error;
  }
}

async function getAllMessages(leadId) {
  try {
    return await messageRepo.getAllMessages(leadId);
  } catch (error) {
    logger.error(`Error in messageService.getAllMessages: ${error.message}`);
    throw error;
  }
}

module.exports = {
  saveMessage,
  getRecentMessages,
  getAllMessages,
};
