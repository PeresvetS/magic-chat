// src/services/gpt/gptService.js

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const {
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  getGoogleSheetData,
} = require('./llmFunctions');
const AgentChain = require('./agentChain');
const knowledgeBaseService = require('./knowledgeBaseService');

const availableFunctions = {
  change_lead_status_negative: changeLeadStatusNegative,
  change_lead_status_positive: changeLeadStatusPositive,
};

const agentChains = new Map();

async function generateResponse(lead, messages, campaign) {
  try {
    // logger.info(
    //   `Generating response for lead ${safeStringify(lead)} with messages: ${safeStringify(messages)} and campaign: ${safeStringify(campaign)}`,
    // );

    let googleSheetPrompt = '';
    if (campaign.googleSheetUrl) {
      const googleSheetData = await getGoogleSheetData(campaign.googleSheetUrl);
      googleSheetPrompt = googleSheetData
        ? `Here's the current Q&A data: ${safeStringify(googleSheetData)}. Use this information to provide more accurate answers when possible. If a user's question closely matches a question in this data, prioritize using the corresponding answer, but feel free to expand or adapt it as necessary to fully address the user's query.`
        : '';
    }

    let agentChain = agentChains.get(lead.id);
    if (!agentChain) {
      agentChain = new AgentChain(campaign, lead, googleSheetPrompt);
      agentChains.set(lead.id, agentChain);
      logger.info(`Created new AgentChain for ${lead.id}`);
    }

    // Запускаем AgentChain
    const response = await agentChain.run(
      messages[messages.length - 1].content,
    );

    // Проверяем, нужно ли вызвать функцию
    if (response.includes('FUNCTION_CALL:')) {
      const functionName = response.split('FUNCTION_CALL:')[1].trim();
      if (functionName in availableFunctions) {
        const functionResult = await availableFunctions[functionName](
          lead,
          campaign,
          messages,
        );
        return `Function ${functionName} called. Result: ${safeStringify(functionResult)}`;
      }
      return `Function ${functionName} not found.`;
    }

    const tokenCount = agentChain.getTokenCount();

    return { response, tokenCount };
  } catch (error) {
    logger.error('Error generating response:', error);
    return `An error occurred while generating a response: ${error.message}`;
  }
}

module.exports = { generateResponse };
