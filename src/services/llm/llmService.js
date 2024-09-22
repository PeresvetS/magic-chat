// src/services/gpt/gptService.js

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const {
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  updateLeadName,
  updateLeadAddress,
  updateLeadBusinessType,
  updateLeadGenerationMethod,
  updateLeadMainPains,
  updateLeadLocation,
  updateLeadInterests,
} = require('./llmFunctions');
const AgentChain = require('./agentChain');

const leadFunctions = {
  change_lead_status_negative: changeLeadStatusNegative,
  change_lead_status_positive: changeLeadStatusPositive,
  update_lead_name: updateLeadName,
  update_lead_address: updateLeadAddress,
  update_lead_business_type: updateLeadBusinessType,
  update_lead_generation_method: updateLeadGenerationMethod,
  update_lead_main_pains: updateLeadMainPains,
  update_lead_location: updateLeadLocation,
  update_lead_interests: updateLeadInterests,
};

const commonFunctions = {
};

const agentChains = new Map();

async function generateResponse(lead, messages, campaign) {
  try {
    // logger.info(
    //   `Generating response for lead ${safeStringify(lead)} with messages: ${safeStringify(messages)} and campaign: ${safeStringify(campaign)}`,
    // );
    // logger.info(`AgentChain: ${safeStringify(campaign)}`);

    let agentChain = agentChains.get(lead.id);

    if (!agentChain) {
      agentChain = new AgentChain(campaign, lead);
      agentChains.set(lead.id, agentChain);
      logger.info(`Created new AgentChain for ${lead.id}`);
    }

    // Запускаем AgentChain
    const response = await agentChain.run(
      messages[messages.length - 1].content,
    );

    // Проверяем, нужно ли вызвать функцию
    if (response.includes('FUNCTION_CALL:')) {
      const functionCallMatch = response.match(/FUNCTION_CALL:(\w+)\((.*?)\)/);
      if (functionCallMatch) {
        const [, functionName, argsString] = functionCallMatch;
        if (functionName in leadFunctions) {
          const args = JSON.parse(`[${argsString}]`);
          const functionResult = await leadFunctions[functionName](lead, ...args);
          logger.info(`Function ${functionName} called. Result: ${safeStringify(functionResult)}`);
        } 
        else if (functionName in commonFunctions) {
          const args = JSON.parse(`[${argsString}]`);
          const functionResult = await commonFunctions[functionName](...args);
          logger.info(`Function ${functionName} called. Result: ${safeStringify(functionResult)}`);
        }
        logger.info(`Function ${functionName} not found.`);
      }
    }

    const tokenCount = agentChain.getTokenCount();

    return { response, tokenCount };
  } catch (error) {
    logger.error('Error generating response:', error);
    return `An error occurred while generating a response: ${error.message}`;
  }
}

module.exports = { generateResponse };
