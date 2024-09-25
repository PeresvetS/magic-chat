// services/messaging/src/messageProcessor.js

const logger = require('../../../utils/logger');
const llmService = require('../../llm/llmService');
const leadService = require('../../leads/src/leadService');
const { saveMessageStats } = require('../../stats/statsService');
const { campaignsMailingService } = require('../../campaign');
const {
  getPendingConversationStates,
} = require('../../conversation/conversationState');
const { safeStringify } = require('../../../utils/helpers')
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const WABABotStateManager = require('../../waba/managers/botStateManager');

async function processMessage(senderId, textToProcess, phoneNumber, campaign, platform) {
  try {

    const BotStateManager = platform === 'telegram' ? TelegramBotStateManager :
    platform === 'whatsapp' ? WhatsAppBotStateManager :
    platform === 'waba' ? WABABotStateManager : null; 

    logger.info(
      `BotStateManager for ${platform}: ${BotStateManager ? 'Loaded' : 'Not loaded'}`,
    );

    const message = await BotStateManager.handleIncomingMessage(
      phoneNumber,
      senderId,
      textToProcess,
    );

    if (message === null) {
      return;
    }

    logger.info(`Combined message: ${message}`);

    const lead = await getOrCreateLeadIdByChatId(
      senderId,
      platform,
      campaign.userId,
    );
    logger.info(`Lead: ${JSON.stringify(lead)}`);


    // Сохраняем входящее сообщение в БД
    logger.info(`Saving message for lead ${lead.id} , userId ${campaign.userId}`);

   // const incomingMessage = await messageService.saveMessage(lead.id, campaign.userId, message, '', 'new');

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
    // await messageService.updateMessage(incomingMessage.id, {
    //   status: 'response_generated',
    // });

    logger.info(`Response generated for ${senderId}: ${response}`);
    logger.debug(`Token count for ${senderId}: ${tokenCount}`);

    await saveMessageStats(senderId, phoneNumber, tokenCount);
    // await saveDialogToFile(senderId, message, response);

    // return { response, messageId: incomingMessage.id };
    return { response: response, messageId: null, leadId: lead.id };
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


async function getLeadIdByChatId(chatId, platform) {
  try {
    let lead;
    switch (platform) {
      case 'whatsapp':
      case 'waba':
        lead = await leadService.getLeadByWhatsappChatId(chatId);
        break;
      case 'telegram':
        lead = await leadService.getLeadByTelegramChatId(chatId);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    return lead || null;
  } catch (error) {
    logger.error('Error getting lead ID by chat ID:', error);
    return null;
  }
}

async function getOrCreateLeadIdByChatId(chatId, platform, userId) {
  const lead = await getLeadIdByChatId(chatId, platform);
  if (!lead) {
    logger.info(`Lead not found for ${platform} chat ID ${chatId}`);
    const newLead = await leadService.createLead(platform, chatId, userId);
    return newLead;
  }
  return lead;
}

module.exports = { processMessage, processPendingMessages };
