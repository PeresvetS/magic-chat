// src/services/messaging/src/handleMessageService.js

const logger = require('../../../utils/logger');
const { sendResponse } = require('./messageSender');
const { processMessage } = require('./messageProcessor');
const { safeStringify } = require('../../../utils/helpers');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');

logger.info('HandleMessageService loaded');
logger.info('TelegramBotStateManager:', TelegramBotStateManager ? 'Loaded' : 'Not loaded');
logger.info('WhatsAppBotStateManager:', WhatsAppBotStateManager ? 'Loaded' : 'Not loaded');

async function processIncomingMessage(phoneNumber, event, platform = 'telegram') {
  try {
    const { senderId, messageText } = extractMessageInfo(event, platform);
    if (!senderId || !messageText) return;

    logger.info(`Обработка ${platform} сообщения для ${phoneNumber}: senderId=${senderId}, text=${messageText}`);

    const BotStateManager = platform === 'whatsapp' ? WhatsAppBotStateManager : TelegramBotStateManager;

    const combinedMessage = await BotStateManager.handleIncomingMessage(phoneNumber, senderId, messageText);
    if (!combinedMessage) {
      logger.info(`Сообщение добавлено в буфер для пользователя ${senderId}`);
      return;
    }

    const response = await processMessage(senderId, combinedMessage, phoneNumber);
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


function extractMessageInfo(event, platform) {
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

    let senderId = null;
    if (message.fromId) {
      senderId = message.fromId.userId ? message.fromId.userId.toString() : null;
    } else if (message.peerId) {
      senderId = message.peerId.userId ? message.peerId.userId.toString() : null;
    }

    return { senderId, messageText: message.text };
  }
}

module.exports = { processIncomingMessage };