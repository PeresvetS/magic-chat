// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const { generateResponse } = require('../../gpt/gptService');
const ContextManager = require('../../langchain/contextManager');
const { saveMessageStats } = require('../../stats/statsService');
const { countTokensForMessages } = require('../../tokenizer/tokenizer');
const { saveDialogToFile } = require('../../../utils/messageUtils');

const contextManagers = new Map();

async function processMessage(lead, senderId, message, phoneNumber, сampaign) {
  logger.info(`Processing message for phone number ${phoneNumber}: ${message}`);
  try {
    if (!сampaign.prompt) {
      logger.warn(`No prompt provided for processing message from ${senderId}`);
      return null;
    }
    const contextManager = getOrCreateContextManager(senderId);

    // Проверяем, есть ли уже сообщения в контексте
    const existingMessages = await contextManager.getMessages();
    if (existingMessages.length === 0 && сampaign.message) {
      // Если это первое сообщение и есть приветственное сообщение, добавляем его как сообщение от ассистента
      await contextManager.addMessage({
        role: 'assistant',
        content: сampaign.message,
      });
    }

    await contextManager.addMessage({ role: 'human', content: message });
    const messages = await contextManager.getMessages();

    const response = await generateResponse(lead, messages, сampaign);
    logger.info(`Response generated: ${response}`);

    await contextManager.addMessage({ role: 'assistant', content: response });

    const tokenCount = countTokensForMessages([
      ...messages,
      { role: 'assistant', content: response },
    ]);
    await saveMessageStats(senderId, phoneNumber, tokenCount);
    await saveDialogToFile(senderId, message, response);

    return response;
  } catch (error) {
    logger.error('Error in processMessage:', error);
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
