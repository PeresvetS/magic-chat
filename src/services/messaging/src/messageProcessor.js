// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const { generateResponse } = require('../../gpt/gptService');
const ContextManager = require('../../langchain/contextManager');
const { countTokensForMessages } = require('../../tokenizer/tokenizer');
const { saveMessageStats, saveDialogToFile } = require('../../../utils/messageUtils');
const { getActiveCampaignForPhoneNumber } = require('../../campaign').campaignsMailingService;
const { getPromptById } = require('../../prompt').promptService;

const contextManagers = new Map();

async function processMessage(senderId, message, phoneNumber, prompt) {
  logger.info(`Processing message for phone number ${phoneNumber}: ${message}`);
  try {

    if (!prompt) {
      logger.warn(`No prompt provided for processing message from ${senderId}`);
      return null;
    }
    
    const contextManager = getOrCreateContextManager(senderId);
    await contextManager.addMessage({ role: 'human', content: message });
    const messages = await contextManager.getMessages();
    
    
    const response = await generateResponse(messages, prompt);
    logger.info(`Response generated: ${response}`);

    await contextManager.addMessage({ role: 'assistant', content: response });

    const tokenCount = countTokensForMessages([...messages, { role: 'assistant', content: response }]);
    await saveMessageStats(senderId, phoneNumber, tokenCount);
    await saveDialogToFile(senderId, message, response);

    return response;
  } catch (error) {
    logger.error(`Error in processMessage:`, error);
    throw error;
  }
}

function getOrCreateContextManager(userTgId) {
  if (!contextManagers.has(userTgId)) {
    contextManagers.set(userTgId, new ContextManager());
  }
  return contextManagers.get(userTgId);
}

module.exports = { processMessage };