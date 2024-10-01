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
} = require('./tools/llmTools');
const AgentGPT = require('./agents/agentGPT');

const tools = [
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  updateAddress,
  updateBusinessType,
  updateGenerationMethod,
  updateMainPains,
  updateLocation,
  updateInterests,
];

const agentGPTs = new Map();

async function generateResponse(lead, messages, campaign) {
  try {
    // logger.info(
    //   `Generating response for lead ${safeStringify(lead)} with messages: ${safeStringify(messages)} and campaign: ${safeStringify(campaign)}`,
    // );

    let agentGPT = agentGPTs.get(lead.id);

    if (!agentGPT) {
      agentGPT = new AgentGPT(campaign, lead, tools);
      agentGPTs.set(lead.id, agentGPT);
      logger.info(`Created new AgentGPT for ${lead.id}`);
    }

    const userMessage = messages[messages.length - 1].content;
    const response = await agentGPT.run(userMessage);

    const tokenCount = agentGPT.getTokenCount();

    return { response, tokenCount };

  } catch (error) {
    logger.error('Error generating response:', error);
    return { response: `An error occurred while generating a response: ${error.message}`, tokenCount: 0 };
  }
}

module.exports = { generateResponse };