// src/utils/messageUtils.js

const path = require('path');
const fs = require('fs').promises;

const logger = require('./logger');
const { RETRY_OPTIONS } = require('../config/constants');

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

async function retryOperation(operation, options = {}) {
  const {
    maxRetries = RETRY_OPTIONS.MAX_RETRIES,
    retryDelay = RETRY_OPTIONS.RETRY_DELAY,
    shouldRetry = RETRY_OPTIONS.SHOULD_RETRY,
    onRetry = (error, attemptNumber) => {
      logger.warn(`Retry attempt ${attemptNumber} due to error: ${error.message}`);
    }
  } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      onRetry(error, attempt);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

module.exports = {
  retryOperation,
  saveDialogToFile,
};
