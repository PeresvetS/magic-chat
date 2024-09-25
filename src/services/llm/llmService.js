// src/services/llm/llmService.js

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const {
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  updateAddress,
  updateBusinessType,
  updateGenerationMethod,
  updateMainPains,
  updateLocation,
  updateInterests,
  updateField,
} = require('./tools/llmTools');
const AgentChain = require('./agents/agentChain');

const tools = [
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  updateAddress,
  updateBusinessType,
  updateGenerationMethod,
  updateMainPains,
  updateLocation,
  updateInterests,
  updateField,
];

const agentChains = new Map();

async function generateResponse(lead, messages, campaign) {
  try {

    // logger.info(
    //   `Generating response for lead ${safeStringify(lead)} with messages: ${safeStringify(messages)} and campaign: ${safeStringify(campaign)}`,
    // );

    let agentChain = agentChains.get(lead.id);

    if (!agentChain) {
      agentChain = new AgentChain(campaign, lead, tools);
      agentChain.primaryAgent = await agentChain.createPrimaryAgent();
      agentChains.set(lead.id, agentChain);
      logger.info(`Created new AgentChain for ${lead.id}`);
    }

    const response = await agentChain.run(messages[messages.length - 1].content);

    const tokenCount = agentChain.getTokenCount();

    return { response, tokenCount };

  } catch (error) {
    logger.error('Error generating response:', error);
    return `An error occurred while generating a response: ${error.message}`;
  }
}

module.exports = { generateResponse };