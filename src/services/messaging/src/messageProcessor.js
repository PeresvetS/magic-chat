// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const gptService = require('../../llm/llmService');
const { leadService } = require('../../leads/src/leadService');
const { saveMessageStats } = require('../../stats/statsService');
const { saveDialogToFile } = require('../../../utils/messageUtils');
const { campaignMailingService } = require('../../campaign');
const {
  getPendingConversationStates,
} = require('../../conversation/conversationState');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');
const { messageRepo } = require('../../../db');

async function processMessage(lead, senderId, message, phoneNumber, campaign) {
  try {
    // Сохраняем входящее сообщение в БД
    const incomingMessage = await messageRepo.createMessage({
      leadId: lead.id,
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

    // Генерируем ответ с помощью GPT
    const { response, tokenCount } = await gptService.generateResponse(
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
    await saveDialogToFile(senderId, message, response);

    // Разбиваем ответ на предложения и отправляем в очередь
    const sentences = response.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      await RabbitMQQueueService.enqueue('outgoing', {
        campaignId: campaign.id,
        message: sentence,
        recipientPhoneNumber: senderId,
        platform: lead.platform,
        senderPhoneNumber: phoneNumber,
      });
    }

    // Обновляем статус сообщения
    await messageRepo.updateMessage(incomingMessage.id, {
      status: 'queued_for_sending',
    });

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
        const campaign = await campaignMailingService.getCampaignById(
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
