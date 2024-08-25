// src/utils/messageUtils.js

const logger = require('./logger');
const { messageStatsRepo } = require('../db');
const fs = require('fs').promises;
const path = require('path');

async function saveMessageStats(userId, phoneNumber, tokenCount) {
  try {
    await messageStatsRepo.saveMessageStats(userId, phoneNumber, tokenCount);
    logger.info(`Saved message stats for user ${userId}: ${tokenCount} tokens used`);
  } catch (error) {
    logger.error('Error saving message stats:', error);
  }
}

async function saveDialogToFile(userId, userMessage, botResponse) {
  try {
    const dialogDir = path.join(__dirname, '../../../temp/dialogs');
    await fs.mkdir(dialogDir, { recursive: true });
    const filePath = path.join(dialogDir, `${userId}_dialog.txt`);
    const content = `User: ${userMessage}\nBot: ${botResponse}\n\n`;
    await fs.appendFile(filePath, content);
    logger.info(`Dialog saved to file for user ${userId}`);
  } catch (error) {
    logger.error('Error saving dialog to file:', error);
  }
}

module.exports = {
  saveMessageStats,
  saveDialogToFile
};