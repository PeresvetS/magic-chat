// src/services/messaging/src/messageSender.js

const { Api } = require('telegram/tl');

const logger = require('../../../utils/logger');
const { WABASessionService } = require('../../waba');
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
const telegramSessionService = require('../../telegram/services/telegramSessionService');

async function sendMessage(
  senderId,
  message,
  senderPhoneNumber,
  platform,
  BotStateManager,
  campaignId,
) {
  try {
    logger.info(
      `Starting sendMessage for ${platform} user ${senderId} from ${senderPhoneNumber}`,
    );

    let result;
    switch (platform) {
      case 'whatsapp':
        const whatsappClient =
          await WhatsAppSessionService.createOrGetSession(senderPhoneNumber);
        result = await retryOperation(() =>
          whatsappClient.sendMessage(senderId, message),
        );
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
          campaignId,
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
  activeCampaign,
) {
  try {
    let botStateManager;
    if (platform === 'telegram') {
      botStateManager = telegramSessionService.getBotStateManager(phoneNumber);
    } else if (platform === 'whatsapp') {
      // ... аналогично для других платформ
    }

    const { id: campaignId } = activeCampaign;
    logger.info(
      `Starting sendResponse for ${platform} user ${senderId} from ${phoneNumber}`,
    );
    if (!response) {
      logger.warn(`Attempted to send empty ${platform} response to ${senderId}`);
      return;
    }

    await validatePhoneNumber(phoneNumber);
    const sentences = response.split(/\n+/);

    const sendPromise = new Promise(async (resolve, reject) => {
      const startTime = Date.now();

      for (const sentence of sentences) {
        await botStateManager.setTyping(phoneNumber, senderId, campaignId);

        if (botStateManager.hasNewMessageSince(senderId, startTime, campaignId)) {
          logger.info(`Response interrupted for user ${userId}`);
          resolve();
          return;
        }

        const result = await sendMessage(
          senderId,
          sentence,
          phoneNumber,
          platform,
          botStateManager,
          campaignId,
          );
        logger.info(`Message sent to ${senderId}, result: ${JSON.stringify(result)}`);
        botStateManager.resetOfflineTimer(phoneNumber, senderId, campaignId);

        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 2000 + 1000),
        );
      }

      await botStateManager.setOnline(phoneNumber, senderId);
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

      await BotStateManager.setTyping(senderPhoneNumber, senderId, companyId);

      if (BotStateManager.hasNewMessageSince(senderId, startTime, companyId)) {
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
