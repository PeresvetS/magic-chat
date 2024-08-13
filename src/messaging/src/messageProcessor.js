// src/messaging/messageProcessor.js

const { generateResponse } = require('../services/gpt/gptService');
const ContextManager = require('../services/langchain/contextManager');
const { countTokens } = require('../services/tokenizer/tokenizer');
const { simulateTyping, sendMessage, checkNewMessages } = require('./messageSender');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');
const db = require('../../db/postgres/config');

const contextManagers = new Map();

async function processMessage(userId, message, phoneNumber) {
  try {
    if (!contextManagers.has(userId)) {
      contextManagers.set(userId, new ContextManager());
    }
    const contextManager = contextManagers.get(userId);

    await contextManager.addMessage('human', message);
    const messages = await contextManager.getMessages();

    const systemPrompt = "You are a helpful assistant."; // Customize this
    const response = await generateResponse(messages, systemPrompt);

    await contextManager.addMessage('ai', response);

    const tokenCount = countTokens(response);
    await saveMessageStats(userId, phoneNumber, tokenCount);
    await saveDialogToFile(userId, message, response);

    const sentences = response.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      await simulateTyping(userId, getTypingDuration(sentence));
      if (await checkNewMessages(userId)) {
        logger.info('New message received, stopping response');
        break;
      }
      await sendMessage(userId, sentence);
      await new Promise(resolve => setTimeout(resolve, getResponseDelay()));
    }
  } catch (error) {
    logger.error('Error processing message:', error);
    throw error;
  }
}

function getTypingDuration(text) {
  return Math.floor(Math.random() * (20 - 5 + 1) + 5) * 1000;
}

function getResponseDelay() {
  return Math.floor(Math.random() * (10 - 1 + 1) + 1) * 1000;
}

async function saveMessageStats(userId, phoneNumber, tokenCount) {
  const query = `
    INSERT INTO message_stats (user_id, phone_number, tokens_used, timestamp)
    VALUES ($1, $2, $3, NOW())
  `;
  await db.query(query, [userId, phoneNumber, tokenCount]);
}

async function saveDialogToFile(userId, userMessage, botResponse) {
  const dialogDir = path.join(__dirname, '../../dialogs');
  if (!fs.existsSync(dialogDir)) {
    fs.mkdirSync(dialogDir);
  }
  const filePath = path.join(dialogDir, `${userId}_dialog.txt`);
  const content = `User: ${userMessage}\nBot: ${botResponse}\n\n`;
  fs.appendFileSync(filePath, content);
}

module.exports = { processMessage };