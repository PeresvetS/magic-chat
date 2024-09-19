// src/services/messaging/src/handleMessageService.js

const logger = require('../../../utils/logger');
const { sendResponse } = require('./messageSender');
const { processMessage } = require('./messageProcessor');
const { leadService } = require('../../leads');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const WABABotStateManager = require('../../waba/managers/botStateManager');
const { getActiveCampaignForPhoneNumber } =
  require('../../campaign').campaignsMailingService;

logger.info('HandleMessageService loaded');
logger.info(
  'TelegramBotStateManager:',
  TelegramBotStateManager ? 'Loaded' : 'Not loaded',
);
logger.info(
  'WhatsAppBotStateManager:',
  WhatsAppBotStateManager ? 'Loaded' : 'Not loaded',
);
logger.info(
  'WABABotStateManager:',
  WABABotStateManager ? 'Loaded' : 'Not loaded',
);

async function processIncomingMessage(
  phoneNumber,
  event,
  platform = 'telegram',
) {
  try {
    logger.info(
      `Starting processIncomingMessage for ${platform}, phone: ${phoneNumber}`,
    );

    const { senderId, messageText } = await extractMessageInfo(event, platform);
    if (!senderId || !messageText) {
      logger.warn(
        `Invalid message info extracted for ${platform}, phone: ${phoneNumber}`,
      );
      return;
    }

    logger.info(
      `Processing ${platform} message for ${phoneNumber}: senderId=${senderId}, text=${messageText}`,
    );

    const activeCampaign = await getActiveCampaignForPhoneNumber(phoneNumber);
    logger.info(
      `Active campaign for ${phoneNumber}: ${JSON.stringify(activeCampaign)}`,
    );

    if (!activeCampaign || !activeCampaign.prompt) {
      logger.warn(
        `No active campaign or prompt for ${phoneNumber}. Message ignored.`,
      );
      return;
    }

    const BotStateManager = getBotStateManager(platform);
    logger.info(
      `BotStateManager for ${platform}: ${BotStateManager ? 'Loaded' : 'Not loaded'}`,
    );

    const combinedMessage = await BotStateManager.handleIncomingMessage(
      phoneNumber,
      senderId,
      messageText,
    );
    logger.info(`Combined message: ${combinedMessage}`);

    const lead = await getOrCreateLeadIdByChatId(
      senderId,
      platform,
      activeCampaign.userId,
    );
    logger.info(`Lead: ${JSON.stringify(lead)}`);

    const messageToProcess = combinedMessage || messageText;

    const response = await processMessage(
      lead,
      senderId,
      messageToProcess,
      phoneNumber,
      activeCampaign,
    );
    logger.info(`Generated response: ${response}`);

    if (response) {
      logger.info(`Sending response to user ${senderId}: ${response}`);
      await sendResponse(senderId, response, phoneNumber, platform);
    } else {
      logger.warn(
        `No response generated for ${platform} message from ${senderId}`,
      );
    }

    logger.info(
      `Processed ${platform} message for ${phoneNumber} from ${senderId}: ${JSON.stringify(messageText)}`,
    );
  } catch (error) {
    logger.error(
      `Error processing incoming ${platform} message for ${phoneNumber}:`,
      error,
    );
  }
}

function getBotStateManager(platform) {
  switch (platform) {
    case 'telegram':
      return TelegramBotStateManager;
    case 'whatsapp':
      return WhatsAppBotStateManager;
    case 'waba':
      return WABABotStateManager;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function extractMessageInfo(event, platform) {
  if (platform === 'whatsapp' || platform === 'waba') {
    if (!event.body) {
      logger.warn(`${platform} event does not contain a message body`);
      return {};
    }
    logger.info(
      `Extracted ${platform} message: ${event.body}, from ${event.from} and chatId ${event.chatId}`,
    );
    return {
      senderId: event.from,
      messageText: event.body,
      chatId: event.chatId,
    };
  }
  const { message } = event;
  if (!message) {
    logger.warn('Telegram event does not contain a message');
    return {};
  }

  let chatId = message.chatId ? message.chatId.toString() : null;
  if (!chatId && message.chat && message.chat.id) {
    chatId = message.chat.id.toString();
  }

  // Добавим проверку на наличие текста сообщения
  const messageText = message.text || message.caption || '';

  return { senderId: chatId, messageText };
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

module.exports = { processIncomingMessage };
