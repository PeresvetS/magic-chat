// src/services/messaging/src/handleMessageService.js

const logger = require('../../../utils/logger');
const { sendResponse } = require('./messageSender');
const { processMessage } = require('./messageProcessor');
const { getActiveCampaignForPhoneNumber } =
  require('../../campaign').campaignsMailingService;
const voiceService = require('../../voice/voiceService');
const fileService = require('./fileService');;
const { Api } = require('telegram/tl');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function processIncomingMessage(
  phoneNumber,
  event,
  platform = 'telegram',
  client,
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
        await sendResponse(senderId, 'Извините, произошла ошибка ��ри обработке файла.', phoneNumber, platform);
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
          localFilePath = await fileService.getFileUrl(filePath, platform, phoneNumber, message, client);
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
    
    const { response, messageId, leadId } = await processMessage(
      senderId,
      textToProcess,
      phoneNumber,
      activeCampaign,
      platform,
    );
    logger.info(`Generated response: ${response}`);


    if (response) {
      logger.info(`Sending response to user ${senderId}: ${response}`);
      await sendResponse(leadId, senderId, response, phoneNumber, platform, activeCampaign, messageId); // добавить сохранение инфо, что ответ отправлен
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
  
  // For Telegram
  if (!event || !event.message) {
    logger.warn('Telegram event does not contain a message');
    return {};
  }

  const { message } = event;

  if (message.peerId.channelId) {
    return {};
  }

  let chatId = message.peerId.userId ? message.peerId.userId.toString() : null;

  let messageType = 'text';
  let messageText = message.text || '';
  let filePath = null;

  logger.info(`Extracting message info: ${JSON.stringify(message)}`);

  if (message.media) {
    if (message.media instanceof Api.MessageMediaDocument) {
      const document = message.media.document;
      if (document && document.mimeType === 'audio/ogg') {
        messageType = 'voice';
        filePath = document.id ? document.id.toString() : null;
      } else {
        messageType = 'document';
        filePath = document.id ? document.id.toString() : null;
      }
    } else if (message.media instanceof Api.MessageMediaPhoto) {
      messageType = 'photo';
      filePath = message.media.photo ? message.media.photo.id.toString() : null;
    }
  }

  logger.info(`Extracted message info: chatId=${chatId}, messageType=${messageType}, filePath=${filePath}`);

  return { senderId: chatId, messageText, messageType, filePath, message };
}

module.exports = { processIncomingMessage };
