// src/services/gpt/gptService.js

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const { changeLeadStatusPositive, changeLeadStatusNegative, getGoogleSheetData } = require('./gptFunctions');

const availableFunctions = {
  change_lead_status_negative: changeLeadStatusNegative,
  change_lead_status_positive: changeLeadStatusPositive,
};

async function generateResponse(lead, messages, campaign, agentChain) {
  try {
    logger.info(
      `Generating response for lead ${safeStringify(lead)} with messages: ${safeStringify(messages)} and campaign: ${safeStringify(campaign)}`,
    );

    if (campaign.googleSheetUrl) {
      const googleSheetData = await getGoogleSheetData(campaign.googleSheetUrl);
      agentChain.addContext('googleSheetData', googleSheetData);
    }

    const userMessage = messages[messages.length - 1].content;
    const response = await agentChain.run(userMessage);

    if (typeof response === 'string' && response.includes('FUNCTION_CALL:')) {
      const functionName = response.split('FUNCTION_CALL:')[1].trim();
      if (functionName in availableFunctions) {
        const functionResult = await availableFunctions[functionName](lead, campaign, messages);
        return `Function ${functionName} called. Result: ${safeStringify(functionResult)}`;
      }
      return `Function ${functionName} not found.`;
    }

    return response;
  } catch (error) {
    logger.error('Error generating response:', error);
    throw error;
  }
}

module.exports = { generateResponse };