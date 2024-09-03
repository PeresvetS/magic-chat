// src/services/messaging/src/handleMessageService.js

const logger = require('../../../utils/logger');
const { sendResponse } = require('./messageSender');
const { processMessage } = require('./messageProcessor');
const { safeStringify } = require('../../../utils/helpers');
const LeadsService = require('../../leads/src/LeadsService');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const { getActiveCampaignForPhoneNumber } = require('../../campaign').campaignsMailingService;

logger.info('HandleMessageService loaded');
logger.info('TelegramBotStateManager:', TelegramBotStateManager ? 'Loaded' : 'Not loaded');
logger.info('WhatsAppBotStateManager:', WhatsAppBotStateManager ? 'Loaded' : 'Not loaded');

async function processIncomingMessage(phoneNumber, event, platform = 'telegram') {
  try {
    const { senderId, messageText } = await extractMessageInfo(event, platform);
    if (!senderId || !messageText) return;

    logger.info(`Обработка ${platform} сообщения для ${phoneNumber}: senderId=${senderId}, text=${messageText}`);

    const activeCampaign = await getActiveCampaignForPhoneNumber(phoneNumber);
    if (!activeCampaign) {
      logger.info(`Нет активной кампании для номера ${phoneNumber}. Сообщение игнорируется.`);
      return;
    }

    if (!activeCampaign.prompt) {
      logger.warn(`Активная кампания для номера ${phoneNumber} не имеет привязанного промпта. Сообщение игнорируется.`);
      return;
    }

    const BotStateManager = platform === 'whatsapp' ? WhatsAppBotStateManager : TelegramBotStateManager;

    const combinedMessage = await BotStateManager.handleIncomingMessage(phoneNumber, senderId, messageText);
    if (!combinedMessage) {
      logger.info(`Сообщение добавлено в буфер для пользователя ${senderId}`);
      return;
    }

    const leadId = await getLeadIdByChatId(senderId, platform);
    
    const response = await processMessage(leadId, senderId, combinedMessage, phoneNumber, activeCampaign.prompt.content, activeCampaign.message, activeCampaign.googleSheetUrl);
    if (response) {
      logger.info(`Отправка ответа пользователю ${senderId}: ${response}`);
      await sendResponse(senderId, response, phoneNumber, platform);
    } else {
      logger.warn(`Не сгенерирован ответ для ${platform} сообщения от ${senderId}`);
    }

    logger.info(`Обработано ${platform} сообщение для ${phoneNumber} от ${senderId}: ${safeStringify(messageText)}`);
  } catch (error) {
    logger.error(`Ошибка при обработке входящего ${platform} сообщения для ${phoneNumber}:`, error);
  }
}

async function extractMessageInfo(event, platform) {
  if (platform === 'whatsapp') {
    if (!event.body) {
      logger.warn(`WhatsApp event does not contain a message body`);
      return {};
    }
    return { senderId: event.from, messageText: event.body };
  } else {
    const message = event.message;
    if (!message) {
      logger.warn(`Telegram event does not contain a message`);
      return {};
    }

    let chatId = message.chatId ? message.chatId.toString() : null;
    if (!chatId && message.chat && message.chat.id) {
      chatId = message.chat.id.toString();
    }

    return { senderId: chatId, messageText: message.text };
  }
}

async function getLeadIdByChatId(chatId, platform) {
  try {
    let lead;
    if (platform === 'whatsapp') {
      lead = await LeadsService.getLeadByWhatsappChatId(chatId);
    } else {
      lead = await LeadsService.getLeadByTelegramChatId(chatId);
    }
    return lead ? lead.id.toString() : null;
  } catch (error) {
    logger.error(`Error getting lead ID by chat ID:`, error);
    return null;
  }
}

module.exports = { processIncomingMessage };