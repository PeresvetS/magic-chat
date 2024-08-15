// src/messaging/src/messageProcessor.js

const { generateResponse } = require('../../services/gpt/gptService');
const ContextManager = require('../../services/langchain/contextManager');
const { countTokens, countTokensForMessages } = require('../../services/tokenizer/tokenizer');
const logger = require('../../utils/logger');
const { saveMessageStats, saveDialogToFile } = require('../../utils/messageUtils');
const { sendResponse } = require('./messageSender');
const { getOrCreateSession } = require('../../services/telegram/sessionManager');

const contextManagers = new Map();

async function processMessage(userId, message, phoneNumber) {
  logger.info(`Processing message in processMessage function: ${message}`);
  try {
    if (!contextManagers.has(userId)) {
      contextManagers.set(userId, new ContextManager());
    }
    const contextManager = contextManagers.get(userId);

    await contextManager.addMessage({ role: 'human', content: message });
    const messages = await contextManager.getMessages();

    const systemPrompt = "You are a helpful assistant. You answer concisely and kindly, write like a person in correspondence. Sometimes use emoticons for greater expressiveness. Answer in Russian."; // Customize this
    logger.info(`Message processed, generating response`);
    const response = await generateResponse(messages, systemPrompt);
    logger.info(`Response generated: ${response}`);

    await contextManager.addMessage({ role: 'assistant', content: response });

    const tokenCount = countTokensForMessages([...messages, { role: 'assistant', content: response }]);
    await saveMessageStats(userId, phoneNumber, tokenCount);
    await saveDialogToFile(userId, message, response);

    const session = await getOrCreateSession(phoneNumber);

    logger.info(`Starting response for user ${userId}`);
    await sendResponse(session, userId, response, phoneNumber);
    logger.info(`Response sent for user ${userId}`);

  } catch (error) {
    logger.error(`Error in processMessage:`, error);
    throw error;
  }
}

module.exports = { processMessage };