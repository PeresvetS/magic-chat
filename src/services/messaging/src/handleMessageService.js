// src/services/messaging/src/handleMessageService.js

const logger = require('../../../utils/logger');
const { sendResponse } = require('./messageSender');
const { processMessage } = require('./messageProcessor');
const { leadService } = require('../../leads');
const { getActiveCampaignForPhoneNumber } =
  require('../../campaign').campaignsMailingService;
const voiceService = require('../../voice/voiceService');
const fileService = require('./fileService');
const { safeStringify } = require('../../../utils/helpers');
const { Api } = require('telegram/tl');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const WABABotStateManager = require('../../waba/managers/botStateManager');

async function processIncomingMessage(
  phoneNumber,
  event,
  platform = 'telegram',
) {
  try {

    const { senderId, messageText, messageType, filePath, message } = await extractMessageInfo(event, platform);
    logger.info(`Extracted message info: senderId=${senderId}, messageType=${messageType}, filePath=${filePath}`);

    if (!senderId) {
      logger.warn(
        `Invalid message info extracted for ${platform}, phone: ${phoneNumber}`,
      );
      return;
    }

    let textToProcess = messageText;

    if (messageType === 'document' || messageType === 'photo' || messageType === 'video') {
      try {
        await fileService.processFile({ reply: (text) => sendResponse(senderId, text, phoneNumber, platform) }, filePath);
      } catch (fileError) {
        logger.error(`Error processing file: ${fileError.message}`);
        await sendResponse(senderId, 'Извините, произошла ошибка при обработке файла.', phoneNumber, platform);
      }
      return;
    } else if (messageType === 'voice' || messageType === 'audio') {
      try {
        if (!message || !message.media) {
          throw new Error('Message does not contain media');
        }
        
        logger.info(`Processing audio message for ${platform}`);
        
        let localFilePath;
        if (platform === 'telegram') {
          localFilePath = await fileService.downloadTelegramVoiceMessage(message);
        } else {
          localFilePath = await fileService.getFileUrl(filePath, platform, phoneNumber, message);
        }
        
        logger.info(`Got file path: ${localFilePath}`);

        textToProcess = await voiceService.transcribeAudio(localFilePath);
        logger.info(`Transcribed audio: ${textToProcess}`);

        // Удаляем временный файл
        await fs.unlink(localFilePath).catch(err => logger.warn(`Failed to delete temp file: ${err}`));
      } catch (audioError) {
        logger.error(`Error processing audio: ${audioError.message}`);
        logger.error(`Error stack: ${audioError.stack}`);
        await sendResponse(senderId, 'Извините, произошла ошибка при обработке аудио сообщения. Пожалуйста, попробуйте отправить текстовое сообщение или другое аудио.', phoneNumber, platform);
        return;
      }
    }

    const activeCampaign = await getActiveCampaignForPhoneNumber(phoneNumber);
    if (!activeCampaign || !activeCampaign.prompt) {
      logger.warn(
        `No active campaign or prompt for ${phoneNumber}. Message ignored.`,
      );
      return;
    } 

    const BotStateManager = platform === 'telegram' ? TelegramBotStateManager :
    platform === 'whatsapp' ? WhatsAppBotStateManager :
    platform === 'waba' ? WABABotStateManager : null; 

    logger.info(
      `BotStateManager for ${platform}: ${BotStateManager ? 'Loaded' : 'Not loaded'}`,
    );

    const combinedMessage = await BotStateManager.handleIncomingMessage(
      phoneNumber,
      senderId,
      textToProcess,
    );

    if (combinedMessage === null) {
      return;
    }

    logger.info(`Combined message: ${combinedMessage}`);

    const lead = await getOrCreateLeadIdByChatId(
      senderId,
      platform,
      activeCampaign.userId,
    );
    logger.info(`Lead: ${JSON.stringify(lead)}`);

    const response = await processMessage(
      lead,
      senderId,
      combinedMessage,
      phoneNumber,
      activeCampaign,
    );
    logger.info(`Generated response: ${response}`);

    if (response) {
      logger.info(`Sending response to user ${senderId}: ${response}`);
      await sendResponse(senderId, response, phoneNumber, platform, BotStateManager); // добавить сохранение инфо, что ответ отправлен
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
    await sendResponse(senderId, 'Извините, произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте еще раз позже.', phoneNumber, platform);
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
  
  // Для Telegram
  if (!event || !event.message) {
    logger.warn('Telegram event does not contain a message');
    return {};
  }

  const { message } = event;

  let chatId = message.peerId ? message.peerId.userId.toString() : null;

  let messageType = 'text';
  let messageText = message.text || '';
  let filePath = null;

  logger.info(`Extracting message info: ${JSON.stringify(message)}`);

  if (message.media) {
    if (message.media instanceof Api.MessageMediaDocument) {
      const document = message.media.document;
      if (document.mimeType === 'audio/ogg') {
        messageType = 'voice';
        filePath = document.id.toString();
      } else {
        messageType = 'document';
        filePath = document.id.toString();
      }
    } else if (message.media instanceof Api.MessageMediaPhoto) {
      messageType = 'photo';
      filePath = message.media.photo.id.toString();
    }
  }

  logger.info(`Extracted message info: chatId=${chatId}, messageType=${messageType}, filePath=${filePath}`);

  return { senderId: chatId, messageText, messageType, filePath, message };
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
