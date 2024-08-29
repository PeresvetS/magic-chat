// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const { generateResponse } = require('../../gpt/gptService');
const ContextManager = require('../../langchain/contextManager');
const { countTokensForMessages } = require('../../tokenizer/tokenizer');
const { saveMessageStats, saveDialogToFile } = require('../../../utils/messageUtils');

const contextManagers = new Map();

async function processMessage(userId, message, phoneNumber) {
  logger.info(`Processing message in processMessage function: ${message}`);
  try {
    const contextManager = getOrCreateContextManager(userId);
    await contextManager.addMessage({ role: 'human', content: message });
    const messages = await contextManager.getMessages();

    const systemPrompt = "You are a helpful assistant. You answer concisely and kindly, write like a person in correspondence. Sometimes use emoticons for greater expressiveness. Answer in Russian.";
    const response = await generateResponse(messages, systemPrompt);
    logger.info(`Response generated: ${response}`);

    await contextManager.addMessage({ role: 'assistant', content: response });

    const tokenCount = countTokensForMessages([...messages, { role: 'assistant', content: response }]);
    await saveMessageStats(userId, phoneNumber, tokenCount);
    await saveDialogToFile(userId, message, response);

    return response;
  } catch (error) {
    logger.error(`Error in processMessage:`, error);
    throw error;
  }
}

function getOrCreateContextManager(userId) {
  if (!contextManagers.has(userId)) {
    contextManagers.set(userId, new ContextManager());
  }
  return contextManagers.get(userId);
}

module.exports = { processMessage };