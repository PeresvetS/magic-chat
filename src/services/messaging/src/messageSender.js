// src/services/messaging/src/messageSender.js

const { Api } = require('telegram/tl');

const logger = require('../../../utils/logger');
const { WABASessionService } = require('../../waba');
const { TelegramSessionService } = require('../../telegram');
const { safeStringify } = require('../../../utils/helpers');
const { WhatsAppSessionService } = require('../../whatsapp');
const WABABotStateManager = require('../../waba/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const { getPhoneNumberInfo, updatePhoneNumberStats } =
  require('../../phone').phoneNumberService;
const { retryOperation } = require('../../../utils/messageUtils');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');
const { messageRepo } = require('../../../db');

async function sendMessage(
  userId,
  message,
  phoneNumber,
  platform = 'telegram',
) {
  try {
    logger.info(
      `Starting sendMessage for ${platform} user ${userId} from ${phoneNumber}`,
    );

    let result;
    switch (platform) {
      case 'whatsapp':
        const whatsappClient =
          await WhatsAppSessionService.createOrGetSession(phoneNumber);
        result = await retryOperation(() =>
          whatsappClient.sendMessage(userId, message),
        );
        break;
      case 'waba':
        result = await retryOperation(() =>
          WABASessionService.sendMessage(phoneNumber, userId, message),
        );
        break;
      case 'telegram':
      default:
        const { peer, session } = await TelegramBotStateManager.getCorrectPeer(
          phoneNumber,
          userId,
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

    logger.info(
      `${platform} message sent successfully from ${phoneNumber} to ${userId}: ${safeStringify(result)}`,
    );
    await updatePhoneNumberStats(phoneNumber, platform);

    return result;
  } catch (error) {
    return handleSendMessageError(
      error,
      userId,
      message,
      phoneNumber,
      platform,
    );
  }
}

async function sendResponse(
  userId,
  response,
  phoneNumber,
  platform = 'telegram',
) {
  try {
    logger.info(
      `Starting sendResponse for ${platform} user ${userId} from ${phoneNumber}`,
    );
    if (!response) {
      logger.warn(`Attempted to send empty ${platform} response to ${userId}`);
      return;
    }

    await validatePhoneNumber(phoneNumber);
    const sentences = response.split(/(?<=[.!?])\s+/);

    const BotStateManager = getBotStateManager(platform);

    const sendPromise = new Promise(async (resolve, reject) => {
      const startTime = Date.now();

      for (const sentence of sentences) {
        await BotStateManager.setTyping(phoneNumber, userId);

        if (BotStateManager.hasNewMessageSince(userId, startTime)) {
          logger.info(`Response interrupted for user ${userId}`);
          resolve();
          return;
        }

        const result = await sendMessage(
          userId,
          sentence,
          phoneNumber,
          platform,
        );
        logger.info(`Message sent to ${userId},   : ${JSON.stringify(result)}`);
        BotStateManager.resetOfflineTimer(phoneNumber, userId);

        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 2000 + 1000),
        );
      }

      await BotStateManager.setOnline(phoneNumber, userId);
      resolve();
    });

    return sendPromise;
  } catch (error) {
    logger.error(`Error sending ${platform} response to ${userId}: ${error}`);
  }
}

function getBotStateManager(platform) {
  switch (platform) {
    case 'whatsapp':
      return WhatsAppBotStateManager;
    case 'waba':
      return WABABotStateManager;
    case 'telegram':
    default:
      return TelegramBotStateManager;
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
  userId,
  message,
  phoneNumber,
  platform,
) {
  logger.error(
    `Error sending ${platform} message from ${phoneNumber} to ${userId}: ${error.message}`,
  );

  switch (platform) {
    case 'telegram':
      if (error.message.includes('FLOOD_WAIT')) {
        const seconds = parseInt(error.message.split('_')[2]);
        logger.warn(
          `FloodWaitError: Waiting for ${seconds} seconds before retrying`,
        );
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        return sendMessage(userId, message, phoneNumber, platform);
      }

      if (error.message.includes('AUTH_KEY_UNREGISTERED')) {
        logger.info(
          `Attempting to reauthorize Telegram session for ${phoneNumber}`,
        );
        await TelegramSessionService.reauthorizeSession(phoneNumber);
        logger.info(
          `Telegram session reauthorized for ${phoneNumber}, retrying message send`,
        );
        return sendMessage(userId, message, phoneNumber, platform);
      }
      break;

    case 'whatsapp':
      if (error.message.includes('unable to send message')) {
        logger.info(
          `Attempting to reauthorize WhatsApp session for ${phoneNumber}`,
        );
        await WhatsAppSessionService.reauthorizeSession(phoneNumber);
        logger.info(
          `WhatsApp session reauthorized for ${phoneNumber}, retrying message send`,
        );
        return sendMessage(userId, message, phoneNumber, platform);
      }
      break;

    case 'waba':
      if (error.message.includes('authentication failure')) {
        logger.info(
          `Attempting to reauthorize WABA session for ${phoneNumber}`,
        );
        await WABASessionService.reauthorizeSession(phoneNumber);
        logger.info(
          `WABA session reauthorized for ${phoneNumber}, retrying message send`,
        );
        return sendMessage(userId, message, phoneNumber, platform);
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
      const { recipientPhoneNumber, message, senderPhoneNumber, platform } = queueItem;

      const result = await sendMessage(
        recipientPhoneNumber,
        message,
        senderPhoneNumber,
        platform,
      );

      await RabbitMQQueueService.markAsCompleted(queueItem, result);

      // Обновляем статус сообщения в БД
      const dbMessage = await messageRepo.findMessageByCampaignAndRecipient(
        queueItem.campaignId,
        recipientPhoneNumber
      );
      if (dbMessage) {
        await messageRepo.updateMessage(dbMessage.id, {
          status: 'sent',
        });
      }

    } catch (error) {
      logger.error('Error sending queued message:', error);
      await RabbitMQQueueService.markAsFailed(queueItem, error.message);
    }
  }
}

module.exports = { sendMessage, sendResponse, sendQueuedMessages };
