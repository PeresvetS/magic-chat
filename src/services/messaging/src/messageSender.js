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
const { Logform } = require('winston');

async function sendMessage(
  senderId,
  message,
  senderPhoneNumber,
  platform,
  BotStateManager,
) {
  try {
    logger.info(
      `Starting sendMessage for ${platform} user ${senderId} from ${senderPhoneNumber}`,
    );

    let result;
    switch (platform) {
      case 'whatsapp':
        const whatsappClient = await WhatsAppSessionService.createOrGetSession(phoneNumber);
        result = await retryOperation(() => whatsappClient.sendMessage(userId, {
          body: message
        }));
        break;
      case 'waba':
        result = await retryOperation(() =>
          WABASessionService.sendMessage(senderPhoneNumber, senderId, message),
        );
        break;
      case 'telegram':
      default:
        const { peer, session } = await BotStateManager.getCorrectPeer(
          senderPhoneNumber,
          senderId,
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

    await updatePhoneNumberStats(senderPhoneNumber, platform);

    return result;
  } catch (error) {
    return handleSendMessageError(
      error,
      senderId,
      message,
      senderPhoneNumber,
      platform,
    );
  }
}

async function sendResponse(
  userId,
  senderId,
  response,
  phoneNumber,
  platform = 'telegram',
  messageId = null,
) {
  try {
    logger.info(
      `Starting sendResponse for ${platform} user ${senderId} from ${phoneNumber}`,
    );
    if (!response) {
      logger.warn(`Attempted to send empty ${platform} response to ${senderId}`);
      return;
    }
    const BotStateManager = platform === 'telegram' ? TelegramBotStateManager :
    platform === 'whatsapp' ? WhatsAppBotStateManager :
    platform === 'waba' ? WABABotStateManager : null; 

    await validatePhoneNumber(phoneNumber);
    const sentences = response.split(/\n+/);

    const sendPromise = new Promise(async (resolve, reject) => {
      const startTime = Date.now();

      for (const sentence of sentences) {
        await BotStateManager.setTyping(phoneNumber, senderId);

        if (BotStateManager.hasNewMessageSince(senderId, startTime)) {
          logger.info(`Response interrupted for user ${userId}`);
          resolve();
          return;
        }

        const result = await sendMessage(
          senderId,
          sentence,
          phoneNumber,
          platform,
          BotStateManager,
        );
        logger.info(`Message sent to ${senderId}, result: ${JSON.stringify(result)}`);
        BotStateManager.resetOfflineTimer(phoneNumber, senderId);

        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 2000 + 1000),
        );
      }

      await BotStateManager.setOnline(phoneNumber, senderId);
      resolve();
    });

    return sendPromise;
  } catch (error) {
    logger.error(`Error sending ${platform} response to ${senderId}: ${error}`);
  }
}

//  async function sendResponse(leadId, senderId, response, senderPhoneNumber, platform, campaign, messageId) {
//   try {
//     logger.info(
//       `Starting sendResponse for ${platform} user ${senderId} from ${senderPhoneNumber}`,
//     );
//     if (!response) {
//       logger.warn(`Attempted to send empty ${platform} response to ${senderId}`);
//       return;
//     }

//     await validatePhoneNumber(senderPhoneNumber);

//     // Разбиваем ответ на предложения и отправляем в очередь
//     const sentences = response.split(/\n+/);
    
//     for (const sentence of sentences) {
//       await RabbitMQQueueService.enqueue('messaging', {
//         campaignId: campaign.id,
//         message: sentence,
//         leadId: Number(leadId),
//         senderId,
//         platform,
//         senderPhoneNumber,
//       });
//     }
    
//     // Обновляем статус сообщения
//     await messageService.updateMessage(messageId, {
//       status: 'queued_for_sending',
//     });

//   } catch (error) {
//     logger.error(`Error sending ${platform} response to ${senderId}: ${error}`);
//   }
// }

async function validatePhoneNumber(phoneNumber) {
  const phoneInfo = await getPhoneNumberInfo(phoneNumber);
  logger.info(`Phone info for ${phoneNumber}: ${safeStringify(phoneInfo)}`);

  if (phoneInfo.isBanned) {
    throw new Error(`Phone number ${phoneNumber} is banned`);
  }
}

async function handleSendMessageError(
  error,
  senderId,
  message,
  senderPhoneNumber,
  platform,
) {
  logger.error(
    `Error sending ${platform} message from ${senderPhoneNumber} to ${senderId}: ${error.message}`,
  );

  switch (platform) {
    case 'telegram':
      if (error.message.includes('FLOOD_WAIT')) {
        const seconds = parseInt(error.message.split('_')[2]);
        logger.warn(
          `FloodWaitError: Waiting for ${seconds} seconds before retrying`,
        );
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        return sendMessage(senderId, message, phoneNumber, platform);
      }

      if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
        logger.info(
          `Attempting to reauthorize Telegram session for ${senderPhoneNumber}`,
        );
        await TelegramSessionService.reauthorizeSession(senderPhoneNumber);
        logger.info(
          `Telegram session reauthorized for ${senderPhoneNumber}, retrying message send`,
        );
        return sendMessage(senderId, message, senderPhoneNumber, platform);
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
        return sendMessage(senderId, message, senderPhoneNumber, platform);
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
        return sendMessage(senderId, message, senderPhoneNumber, platform);
      }
      break;
  }

  throw error;
}

async function sendQueuedMessages() {
  while (true) {
    const queueItem = await RabbitMQQueueService.dequeue('messaging');
    if (!queueItem) {
      // Если очередь пуста, ждем немного и проверяем снова
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }

    logger.info(`Dequeued item from messaging queue: ${safeStringify(queueItem)}`);

    try {
      const { leadId, senderId, message, senderPhoneNumber, platform, campaignId } = queueItem;

      logger.info(
        `Processing queued message for ${platform} user ${senderId} from ${senderPhoneNumber}`,
      );

      const BotStateManager = platform === 'telegram' ? TelegramBotStateManager :
        platform === 'whatsapp' ? WhatsAppBotStateManager :
        platform === 'waba' ? WABABotStateManager : null;

      const startTime = Date.now();

      await BotStateManager.setTyping(senderPhoneNumber, senderId);

      if (BotStateManager.hasNewMessageSince(senderId, startTime)) {
        logger.info(`Response interrupted for user ${senderId}`);
        continue;
      }

      const result = await sendMessage(
        senderId,
        message,
        senderPhoneNumber,
        platform,
        BotStateManager,
      );
      logger.info(`Message sent to ${leadId}, result: ${JSON.stringify(result)}`);
      BotStateManager.resetOfflineTimer(senderPhoneNumber, senderId);

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

      await BotStateManager.setOnline(senderPhoneNumber, senderId);

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
