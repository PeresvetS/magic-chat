// src/messaging/utils/messageUtils.js

const logger = require('./logger');
const db = require('../db/postgres/config');
const fs = require('fs').promises;
const path = require('path');

async function saveMessageStats(userId, phoneNumber, tokenCount) {
  try {
    const query = `
      INSERT INTO message_stats (user_id, phone_number, tokens_used, timestamp)
      VALUES ($1, $2, $3, NOW())
    `;
    await db.query(query, [userId, phoneNumber, tokenCount]);
    logger.info(`Saved message stats for user ${userId}: ${tokenCount} tokens used`);
  } catch (error) {
    logger.error('Error saving message stats:', error);
  }
}

async function saveDialogToFile(userId, userMessage, botResponse) {
  try {
    const dialogDir = path.join(__dirname, '../../../dialogs');
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