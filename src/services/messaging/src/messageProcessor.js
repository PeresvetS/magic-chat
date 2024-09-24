// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const llmService = require('../../llm/llmService');
const { leadService } = require('../../leads/src/leadService');
const { saveMessageStats } = require('../../stats/statsService');
const { campaignsMailingService } = require('../../campaign');
const {
  getPendingConversationStates,
} = require('../../conversation/conversationState');
const { messageRepo } = require('../../../db');

async function processMessage(lead, senderId, message, phoneNumber, campaign) {
  try {
    // Сохраняем входящее сообщение в БД
    const incomingMessage = await messageRepo.saveMessage({
      leadId: lead.id,
      dialogId: lead.dialogId,
      userRequest: message,
      status: 'new',
    });

    logger.info(`Processing message for phone number ${phoneNumber}: ${message}`);
    logger.debug(`Lead info: ${JSON.stringify(lead)}`);
    logger.debug(`Campaign info: ${JSON.stringify(campaign)}`);

    if (!campaign.prompt) {
      logger.warn(`No prompt provided for processing message from ${senderId}`);
      return null;
    }

    const { response, tokenCount } = await llmService.generateResponse(
      lead,
      [{ role: 'human', content: message }],
      campaign,
    );

    // Обновляем сообщение в БД
    await messageRepo.updateMessage(incomingMessage.id, {
      assistantResponse: response,
      status: 'response_generated',
    });

    logger.info(`Response generated for ${senderId}: ${response}`);
    logger.debug(`Token count for ${senderId}: ${tokenCount}`);

    await saveMessageStats(senderId, phoneNumber, tokenCount);
    // await saveDialogToFile(senderId, message, response);

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
      const lead = await leadService.getLeadById(state.leadId);
      if (lead) {
        const campaign = await campaignsMailingService.getCampaignById(
          lead.campaignId,
        );
        if (campaign) {
          await processMessage(
            lead,
            lead.telegramChatId || lead.whatsappChatId,
            state.lastMessage,
            lead.phone,
            campaign,
          );
        }
      }
    }
    logger.info('Processed all pending messages');
  } catch (error) {
    logger.error('Error processing pending messages:', error);
  }
}

module.exports = { processMessage, processPendingMessages };
