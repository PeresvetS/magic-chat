// src/utils/messageUtils.js

const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

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
  saveDialogToFile
};