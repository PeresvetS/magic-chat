// src/services/messaging/src/messageSender.js

const { Api } = require('telegram/tl');

const logger = require('../../../utils/logger');
const { WABASessionService } = require('../../waba');
const { TelegramSessionService } = require('../../telegram');
const { safeStringify } = require('../../../utils/helpers');
const { WhatsAppSessionService } = require('../../whatsapp');
const { getPhoneNumberInfo, updatePhoneNumberStats } =
  require('../../phone/src/phoneNumberService');
const { retryOperation } = require('../../../utils/messageUtils');
const messageService = require('../../dialog/messageService');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const WABABotStateManager = require('../../waba/managers/botStateManager');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');

async function sendMessage(
  leadId,
  message,
  senderPhoneNumber,
  platform,
  BotStateManager,
) {
  try {
    logger.info(
      `Starting sendMessage for ${platform} user ${leadId} from ${senderPhoneNumber}`,
    );

    let result;
    switch (platform) {
      case 'whatsapp':
        const whatsappClient =
          await WhatsAppSessionService.createOrGetSession(senderPhoneNumber);
        result = await retryOperation(() =>
          whatsappClient.sendMessage(leadId, message),
        );
        break;
      case 'waba':
        result = await retryOperation(() =>
          WABASessionService.sendMessage(senderPhoneNumber, leadId, message),
        );
        break;
      case 'telegram':
      default:
        const { peer, session } = await BotStateManager.getCorrectPeer(
          senderPhoneNumber,
          leadId,
        );
        result = await retryOperation(() =>
          session.invoke(
            new Api.messages.SendMessage({
              peer,
              message,
              randomId: BigInt(
                Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
              ),
            }),
          ),
        );
        break;
    }

    await updatePhoneNumberStats(phoneNumber, platform);

    return result;
  } catch (error) {
    return handleSendMessageError(
      error,
      leadId,
      message,
      phoneNumber,
      platform,
    );
  }
}

async function sendResponse(leadId, response, senderPhoneNumber, platform, campaign) {
  try {
    logger.info(
      `Starting sendResponse for ${platform} user ${leadId} from ${senderPhoneNumber}`,
    );
    if (!response) {
      logger.warn(`Attempted to send empty ${platform} response to ${leadId}`);
      return;
    }
    // const BotStateManager = platform === 'telegram' ? TelegramBotStateManager :
    // platform === 'whatsapp' ? WhatsAppBotStateManager :
    // platform === 'waba' ? WABABotStateManager : null; 

    await validatePhoneNumber(senderPhoneNumber);

    // Разбиваем ответ на предложения и отправляем в очередь
    const sentences = response.split(/\n+/);
    
    for (const sentence of sentences) {
      await RabbitMQQueueService.enqueue('outgoing', {
        campaignId: campaign.id,
        message: sentence,
        leadId: Number(leadId),
        platform,
        senderPhoneNumber,
      });
    }
    
    // Обновляем статус сообщения
    await messageService.updateMessage(incomingMessage.id, {
      status: 'queued_for_sending',
    });

    // const sendPromise = new Promise(async (resolve, reject) => {
    //   const startTime = Date.now();

    //   for (const sentence of sentences) {
    //     await BotStateManager.setTyping(phoneNumber, leadId);

    //     if (BotStateManager.hasNewMessageSince(leadId, startTime)) {
    //       logger.info(`Response interrupted for user ${leadId}`);
    //       resolve();
    //       return;
    //     }

    //     const result = await sendMessage(
    //       leadId,
    //       sentence,
    //       phoneNumber,
    //       platform,
    //       BotStateManager,
    //     );
    //     logger.info(`Message sent to ${leadId},   : ${JSON.stringify(result)}`);
    //     BotStateManager.resetOfflineTimer(phoneNumber, leadId);

    //     await new Promise((resolve) =>
    //       setTimeout(resolve, Math.random() * 2000 + 1000),
    //     );
    //   }

    //   await BotStateManager.setOnline(phoneNumber, leadId);
    //   resolve();
    // });

    // return sendPromise;
  } catch (error) {
    logger.error(`Error sending ${platform} response to ${leadId}: ${error}`);
  }
}

async function validatePhoneNumber(phoneNumber) {
  const phoneInfo = await getPhoneNumberInfo(phoneNumber);
  logger.info(`Phone info for ${phoneNumber}: ${safeStringify(phoneInfo)}`);

  if (phoneInfo.isBanned) {
    throw new Error(`Phone number ${phoneNumber} is banned`);
  }
}

async function handleSendMessageError(
  error,
  leadId,
  message,
  senderPhoneNumber,
  platform,
) {
  logger.error(
    `Error sending ${platform} message from ${senderPhoneNumber} to ${leadId}: ${error.message}`,
  );

  switch (platform) {
    case 'telegram':
      if (error.message.includes('FLOOD_WAIT')) {
        const seconds = parseInt(error.message.split('_')[2]);
        logger.warn(
          `FloodWaitError: Waiting for ${seconds} seconds before retrying`,
        );
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        return sendMessage(leadId, message, phoneNumber, platform);
      }

      if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
        logger.info(
          `Attempting to reauthorize Telegram session for ${senderPhoneNumber}`,
        );
        await TelegramSessionService.reauthorizeSession(senderPhoneNumber);
        logger.info(
          `Telegram session reauthorized for ${senderPhoneNumber}, retrying message send`,
        );
        return sendMessage(leadId, message, senderPhoneNumber, platform);
      }
      break;

    case 'whatsapp':
      if (error.message.includes('unable to send message')) {
        logger.info(
          `Attempting to reauthorize WhatsApp session for ${senderPhoneNumber}`,
        );
        await WhatsAppSessionService.reauthorizeSession(senderPhoneNumber);
        logger.info(
          `WhatsApp session reauthorized for ${senderPhoneNumber}, retrying message send`,
        );
        return sendMessage(leadId, message, senderPhoneNumber, platform);
      }
      break;

    case 'waba':
      if (error.message.includes('authentication failure')) {
        logger.info(
          `Attempting to reauthorize WABA session for ${senderPhoneNumber}`,
        );
        await WABASessionService.reauthorizeSession(senderPhoneNumber);
        logger.info(
          `WABA session reauthorized for ${senderPhoneNumber}, retrying message send`,
        );
        return sendMessage(leadId, message, senderPhoneNumber, platform);
      }
      break;
  }

  throw error;
}

async function sendQueuedMessages() {
  while (true) {
    const queueItem = await RabbitMQQueueService.dequeue('outgoing');
    if (!queueItem) {
      // Если очередь пуста, ждем немного и проверяем снова
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }

    try {
      const { leadId, message, senderPhoneNumber, platform, campaignId } = queueItem;

      logger.info(
        `Processing queued message for ${platform} user ${leadId} from ${senderPhoneNumber}`,
      );

      const BotStateManager = platform === 'telegram' ? TelegramBotStateManager :
        platform === 'whatsapp' ? WhatsAppBotStateManager :
        platform === 'waba' ? WABABotStateManager : null;

      const startTime = Date.now();

      await BotStateManager.setTyping(senderPhoneNumber, leadId);

      if (BotStateManager.hasNewMessageSince(leadId, startTime)) {
        logger.info(`Response interrupted for user ${leadId}`);
        continue;
      }

      const result = await sendMessage(
        leadId,
        message,
        senderPhoneNumber,
        platform,
        BotStateManager,
      );
      logger.info(`Message sent to ${leadId}, result: ${JSON.stringify(result)}`);
      BotStateManager.resetOfflineTimer(senderPhoneNumber, leadId);

      await RabbitMQQueueService.markAsCompleted(queueItem, result);

      // Обновляем статус сообщения в БД
      const dbMessage = await messageService.findMessageByCampaignAndRecipient(
        campaignId,
        leadId
      );
      if (dbMessage) {
        await messageService.updateMessage(dbMessage.id, {
          status: 'sent',
        });
      }

      await BotStateManager.setOnline(senderPhoneNumber, leadId);

      // Добавляем случайную задержку между сообщениями
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 2000 + 1000),
      );

    } catch (error) {
      logger.error('Error sending queued message:', error);
      await RabbitMQQueueService.markAsFailed(queueItem, error.message);
    }
  }
}

module.exports = { sendMessage, sendResponse, sendQueuedMessages };
