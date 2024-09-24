// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const llmService = require('../../llm/llmService');
const { leadService } = require('../../leads/src/leadService');
const messageService= require('../../dialog/messageService');
const { saveMessageStats } = require('../../stats/statsService');
const { campaignsMailingService } = require('../../campaign');
const {
  getPendingConversationStates,
} = require('../../conversation/conversationState');

async function processMessage(lead, senderId, message, phoneNumber, campaign) {
  try {
    // Сохраняем входящее сообщение в БД
    logger.info(`Saving message for lead ${lead.id} , userId ${campaign.userId}`);

    const incomingMessage = await messageService.saveMessage(lead.id, campaign.userId, message, '', 'new');

    logger.info(`Processing message for phone number ${phoneNumber}: ${message}`);

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
    await messageService.updateMessage(incomingMessage.id, {
      status: 'response_generated',
    });

    logger.info(`Response generated for ${senderId}: ${response}`);
    logger.debug(`Token count for ${senderId}: ${tokenCount}`);

    await saveMessageStats(senderId, phoneNumber, tokenCount);
    // await saveDialogToFile(senderId, message, response);

    return { response, messageId: incomingMessage.id };
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
