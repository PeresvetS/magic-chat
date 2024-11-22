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
    // Создаем уникальный ключ, комбинируя ID лида и ID кампании
    const agentKey = `${lead.id}_${campaign.id}`;
    
    let agentGPT = agentGPTs.get(agentKey);

    if (!agentGPT) {
      agentGPT = new AgentGPT(campaign, lead, tools);
      agentGPTs.set(agentKey, agentGPT);
      logger.info(`Created new AgentGPT for lead ${lead.id} and campaign ${campaign.id}`);
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

function cleanupAgents(maxAge = 3600000) { // maxAge в миллисекундах (по умолчанию 1 час)
  const now = Date.now();
  
  for (const [key, agent] of agentGPTs.entries()) {
    if (now - agent.lastUsed > maxAge) {
      agentGPTs.delete(key);
      logger.info(`Cleaned up inactive agent for key: ${key}`);
    }
  }
}

// Запускаем очистку каждый час
setInterval(cleanupAgents, 3600000);

module.exports = { generateResponse };