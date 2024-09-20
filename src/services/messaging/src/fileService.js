// src/services/messaging/src/fileService.js

const fs = require('fs').promises;
const fsSync = require('fs');  // Добавьте эту строку
const mime = require('mime-types');
const path = require('path');
const os = require('os');
const logger = require('../../../utils/logger');
const WABASessionService = require('../../waba/services/WABASessionService');
const WhatsAppMainSessionService = require('../../whatsapp/services/WhatsAppMainSessionService');
const TelegramMainSessionService = require('../../telegram/services/telegramMainSessionService');
const { Api } = require('telegram');

async function processFile(ctx, filePath) {
    try {
        const mimeType = mime.lookup(filePath) || '';
        if (typeof mimeType === 'string' && mimeType.startsWith('image/')) {
            await ctx.reply('Спасибо за картинку) Но давайте вернёмся к нашей теме, хорошо?');
        } else {
            await ctx.reply('Прошу прощения, но давайте попробуем без файлов) вернёмся к нашей теме, хорошо?');
        }
    } catch (error) {
        logger.error(`Error processing file: ${error.message}`);    
        throw error;
    }
}

async function getFileUrl(filePath, platform, phoneNumber, message) {
  if (!filePath) {
    logger.error(`File ID is undefined for platform: ${platform}, phoneNumber: ${phoneNumber}`);
    throw new Error('File ID is undefined');
  }

  logger.info(`Getting file URL for platform: ${platform}, filePath: ${filePath}, phoneNumber: ${phoneNumber}`);

  switch (platform) {
    case 'telegram':
      return await getTelegramFileUrl(message);
    case 'whatsapp':
      return await getWhatsAppFileUrl(filePath, phoneNumber);
    case 'waba':
      return await getWABAFileUrl(filePath, phoneNumber);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function getTelegramFileUrl(message) {
    logger.info(`Getting Telegram file for message: ${JSON.stringify(message)}`);

    try {
        const client = await TelegramMainSessionService.getMainClient();
        logger.info('Got main client');

        if (!message.media || !message.media.document) {
            throw new Error('Message does not contain media or document');
        }

        const tempDir = path.join(__dirname, '..', '..', '..', '..', 'temp', 'voice');
        await fs.mkdir(tempDir, { recursive: true });
        logger.info(`Created temp directory: ${tempDir}`);

        const tempFilePath = path.join(tempDir, `telegram_file_${Date.now()}.ogg`);
        
        logger.info(`Attempting to download file to: ${tempFilePath}`);

        // Попытка получить обновленную информацию о сообщении
        logger.info(`Attempting to refresh message info for message ID: ${message.id}`);
        const refreshedMessages = await client.invoke(new Api.messages.GetMessages({
            id: [new Api.InputMessageID({id: message.id})]
        }));
        logger.info(`Refreshed messages: ${JSON.stringify(refreshedMessages)}`);

        if (!refreshedMessages || !refreshedMessages.messages || refreshedMessages.messages.length === 0) {
            throw new Error('Failed to get any messages');
        }

        const refreshedMessage = refreshedMessages.messages[0];
        logger.info(`Refreshed message: ${JSON.stringify(refreshedMessage)}`);

        if (!refreshedMessage || !refreshedMessage.media || !refreshedMessage.media.document) {
            throw new Error('Refreshed message does not contain media or document');
        }

        const document = refreshedMessage.media.document;
        logger.info(`Document info: ${JSON.stringify(document)}`);

        // Попытка скачать файл целиком
        logger.info(`Attempting to download entire file`);
        const file = await client.downloadMedia(refreshedMessage.media, {
            outputFile: tempFilePath
        });

        if (!file) {
            throw new Error('Failed to download file');
        }

        // Проверяем размер файла
        const stats = await fs.stat(tempFilePath);
        logger.info(`File stats: ${JSON.stringify(stats)}`);
        if (stats.size === 0) {
            throw new Error(`Downloaded file is empty: ${tempFilePath}`);
        }

        logger.info(`Successfully downloaded Telegram file to: ${tempFilePath}, size: ${stats.size} bytes`);
        return tempFilePath;
    } catch (error) {
        logger.error(`Error downloading Telegram file: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        throw error;
    }
}

async function getWhatsAppFileUrl(filePath, phoneNumber) {
  logger.info(`Getting WhatsApp file URL for filePath: ${filePath}, phoneNumber: ${phoneNumber}`);
  try {
    const mainClient = await WhatsAppMainSessionService.getMainClient();
    const mediaMessage = await mainClient.downloadMedia(filePath);
    const tempFilePath = await saveTemporaryFile(mediaMessage);
    const fileUrl = `file://${tempFilePath}`;
    logger.info(`Generated WhatsApp file URL: ${fileUrl}`);
    return fileUrl;
  } catch (error) {
    logger.error(`Error getting WhatsApp file URL: ${error.message}`);
    throw error;
  }
}

async function getWABAFileUrl(filePath, phoneNumber) {
  logger.info(`Getting WABA file URL for filePath: ${filePath}, phoneNumber: ${phoneNumber}`);
  try {
    const fileUrl = await WABASessionService.getMediaUrl(phoneNumber, filePath);
    logger.info(`Generated WABA file URL: ${fileUrl}`);
    return fileUrl;
  } catch (error) {
    logger.error(`Error getting WABA file URL: ${error.message}`);
    throw error;
  }
}

async function saveTemporaryFile(mediaMessage) {
  const tempFilePath = path.join(os.tmpdir(), `temp_file_${Date.now()}`);
  await fs.writeFile(tempFilePath, mediaMessage.data);
  return tempFilePath;
}

module.exports = {
    processFile,
    getFileUrl,
};



