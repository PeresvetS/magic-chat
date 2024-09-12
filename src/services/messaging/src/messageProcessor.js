// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const { generateResponse } = require('../../gpt/gptService');
const ContextManager = require('../../langchain/contextManager');
const { saveMessageStats } = require('../../stats/statsService');
const { countTokensForMessages } = require('../../tokenizer/tokenizer');
const { saveDialogToFile } = require('../../../utils/messageUtils');

const contextManagers = new Map();

async function processMessage(lead, senderId, message, phoneNumber, campaign) {
  logger.info(`Processing message for phone number ${phoneNumber}: ${message}`);
  logger.debug(`Lead info: ${JSON.stringify(lead)}`);
  logger.debug(`Campaign info: ${JSON.stringify(campaign)}`);

  try {
    if (!campaign.prompt) {
      logger.warn(`No prompt provided for processing message from ${senderId}`);
      return null;
    }

    const contextManager = getOrCreateContextManager(senderId);
    logger.debug(`Context manager created/retrieved for ${senderId}`);

    const existingMessages = await contextManager.getMessages();
    logger.debug(`Existing messages for ${senderId}: ${JSON.stringify(existingMessages)}`);

    if (existingMessages.length === 0 && campaign.message) {
      await contextManager.addMessage({
        role: 'assistant',
        content: campaign.message,
      });
      logger.info(`Added welcome message for ${senderId}: ${campaign.message}`);
    }

    await contextManager.addMessage({ role: 'human', content: message });
    logger.info(`Added user message to context for ${senderId}`);

    const messages = await contextManager.getMessages();
    logger.debug(`Current message context for ${senderId}: ${JSON.stringify(messages)}`);

    const primaryResponse = await generateResponse(lead, messages, campaign);
    logger.info(`Primary response generated for ${senderId}: ${primaryResponse}`);

    let finalResponse = primaryResponse;

    // Check if secondary agent is active and process the response
    if (campaign.isSecondaryAgentActive && campaign.secondaryPrompt) {
      logger.info(`Secondary agent is active for campaign ${campaign.id}`);
      const secondaryResponse = await generateSecondaryResponse(campaign, primaryResponse, messages);
      logger.info(`Secondary response generated for ${senderId}: ${secondaryResponse}`);
      finalResponse = secondaryResponse;
    }

    await contextManager.addMessage({ role: 'assistant', content: finalResponse });
    logger.info(`Added assistant response to context for ${senderId}`);

    const tokenCount = countTokensForMessages([
      ...messages,
      { role: 'assistant', content: finalResponse },
    ]);
    logger.debug(`Token count for ${senderId}: ${tokenCount}`);

    await saveMessageStats(senderId, phoneNumber, tokenCount);
    logger.info(`Saved message stats for ${senderId}`);

    await saveDialogToFile(senderId, message, finalResponse);
    logger.info(`Saved dialog to file for ${senderId}`);

    return finalResponse;
  } catch (error) {
    logger.error(`Error in processMessage for ${senderId}:`, error);
    throw error;
  }
}

async function generateSecondaryResponse(campaign, primaryResponse, messages) {
  try {
    const secondaryPrompt = campaign.secondaryPrompt.content;

    const formattedMessages = [
      { role: 'system', content: secondaryPrompt },
      { role: 'user', content: `Primary model response: ${primaryResponse}` },
      { role: 'user', content: 'Original conversation:' },
      ...messages.map((msg) => ({
        role: msg.role === 'human' ? 'user' : 'assistant',
        content: msg.content,
      })),
    ];

    const response = await generateResponse(null, formattedMessages, campaign);
    return response;
  } catch (error) {
    logger.error('Error generating secondary GPT response:', error);
    return primaryResponse; // Return primary response if secondary fails
  }
}

function getOrCreateContextManager(userTgId) {
  if (!contextManagers.has(userTgId)) {
    logger.info(`Creating new ContextManager for ${userTgId}`);
    contextManagers.set(userTgId, new ContextManager());
  } else {
    logger.info(`Retrieved existing ContextManager for ${userTgId}`);
  }
  return contextManagers.get(userTgId);
}

module.exports = { processMessage };