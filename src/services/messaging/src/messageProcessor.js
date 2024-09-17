// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const gptService = require('../../gpt/gptService');
const AgentChain = require('../../langchain/agentChain');
const leadsService = require('../../leads/src/LeadsService');
const { saveMessageStats } = require('../../stats/statsService');
const { saveDialogToFile } = require('../../../utils/messageUtils');
const campaignMailingService = require('../../campaign/src/campaignsMailingService');
const { getPendingConversationStates } = require('../../conversation/conversationState');

const agentChains = new Map();

async function processMessage(lead, senderId, message, phoneNumber, campaign) {
  logger.info(`Processing message for phone number ${phoneNumber}: ${message}`);
  logger.debug(`Lead info: ${JSON.stringify(lead)}`);
  logger.debug(`Campaign info: ${JSON.stringify(campaign)}`);

  try {
    if (!campaign.prompt) {
      logger.warn(`No prompt provided for processing message from ${senderId}`);
      return null;
    }

    let agentChain = agentChains.get(senderId);
    if (!agentChain) {
      agentChain = new AgentChain(campaign, lead);
      agentChains.set(senderId, agentChain);
      logger.info(`Created new AgentChain for ${senderId}`);
    }

    // Use gptService to generate response
    const response = await gptService.generateResponse(lead, [{ role: 'human', content: message }], campaign, agentChain);
    logger.info(`Response generated for ${senderId}: ${response}`);

    // Save the response to memory
    await agentChain.memory.saveContext({ input: message }, { output: response });

    const tokenCount = agentChain.getTokenCount();
    logger.debug(`Token count for ${senderId}: ${tokenCount}`);

    await saveMessageStats(senderId, phoneNumber, tokenCount);
    logger.info(`Saved message stats for ${senderId}`);

    await saveDialogToFile(senderId, message, response);
    logger.info(`Saved dialog to file for ${senderId}`);

    return response;
  } catch (error) {
    logger.error(`Error in processMessage for ${senderId}:`, error);
    throw error;
  }
}

async function processPendingMessages() {
  try {
    const pendingStates = await getPendingConversationStates();

    for (const state of pendingStates) {
      const lead = await leadsService.getLeadById(state.leadId);
      if (lead) {
        const campaign = await campaignMailingService.getCampaignById(lead.campaignId);
        if (campaign) {
          await processMessage(lead, lead.telegramChatId || lead.whatsappChatId, state.lastMessage, lead.phone, campaign);
        }
      }
    }
    logger.info('Processed all pending messages');
  } catch (error) {
    logger.error('Error processing pending messages:', error);
  }
}

module.exports = { processMessage, processPendingMessages };