// src/services/mailing/services/messageQuequeService.js

const logger = require('../../../utils/logger');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');
const PhoneNumberManagerService = require('../../phone/src/PhoneNumberManagerService');
const { delay, retryOperation } = require('../../../utils/helpers');
const {
  sendTelegramMessage,
  sendWhatsAppMessage,
  sendWABAMessage,
  sendTgAndWa,
  sendTgAndWABA,
} = require('./messageMailingService');

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

async function processQueue(initialQueueItem = null) {
  let queueItem = initialQueueItem;

  while (true) {
    if (!queueItem) {
      queueItem = await RabbitMQQueueService.dequeue();
    }

    if (!queueItem) {
      logger.debug('Queue is empty');
      break;
    }

    if (!queueItem.id || !queueItem.campaignId) {
      logger.warn('Invalid queue item:', queueItem);
      if (queueItem.ackFunction && typeof queueItem.ackFunction === 'function') {
        queueItem.ackFunction();
      }
      queueItem = null;
      continue;
    }

    logger.info(
      `Processing queue item ${queueItem.id} with campaignId ${queueItem.campaignId}`,
    );

    try {
      const result = await processSingleQueueItem(queueItem);
      if (queueItem.ackFunction && typeof queueItem.ackFunction === 'function') {
        await RabbitMQQueueService.markAsCompleted(queueItem, result);
      } else {
        logger.warn('Invalid queue item or missing ackFunction:', queueItem);
      }
    } catch (error) {
      logger.error(`Error processing queue item ${queueItem.id}:`, error);
      if (error.message.includes('FLOOD_WAIT')) {
        await handleFloodWait(queueItem, error);
      } else if (queueItem.nackFunction && typeof queueItem.nackFunction === 'function') {
        await RabbitMQQueueService.markAsFailed(queueItem, error.message);
      } else {
        logger.warn('Invalid queue item or missing nackFunction:', queueItem);
      }
    }

    queueItem = null;
  }
}

async function handleFloodWait(queueItem, error) {
  const waitSeconds = parseInt(error.message.match(/\d+/)[0], 10);
  logger.info(`Flood wait detected for queue item ${queueItem.id}. Rescheduling for ${waitSeconds} seconds later.`);
  
  // Reschedule the message
  const rescheduleTime = new Date(Date.now() + waitSeconds * 1000);
  await RabbitMQQueueService.rescheduleQueueItem(queueItem.id, rescheduleTime);
  
  if (queueItem.ackFunction && typeof queueItem.ackFunction === 'function') {
    queueItem.ackFunction(); // Remove from the current queue
  }
}

async function processSingleQueueItem(queueItem) {
  if (!queueItem || !queueItem.id || !queueItem.campaignId) {
    throw new Error('Invalid queue item');
  }

  let result;
  logger.info(
    `Processing queue item ${queueItem.recipientPhoneNumber} with campaign_id ${queueItem.campaignId}`,
  );
  const queueArgs = {
    campaignId: queueItem.campaignId,
    senderPhoneNumber: queueItem.senderPhoneNumber,
    recipientPhoneNumber: queueItem.recipientPhoneNumber,
    message: queueItem.message,
    platform: queueItem.platform,
  };

  switch (queueItem.platform) {
    case 'telegram':
      result = await sendTelegramMessage(queueArgs);
      break;
    case 'whatsapp':
      result = await sendWhatsAppMessage(queueArgs);
      break;
    case 'waba':
      result = await sendWABAMessage(queueArgs);
      break;
    case 'tgwa':
      result = await sendTgAndWa(queueArgs);
      break;
    case 'tgwaba':
      result = await sendTgAndWABA(queueArgs);
      break;
    default:
      throw new Error(`Unsupported platform: ${queueItem.platform}`);
  }

  if (result.success) {
    return { [queueItem.platform]: result };
  } else if (result.error === 'DAILY_LIMIT_REACHED') {
    const newSenderPhoneNumber = await PhoneNumberManagerService.switchToNextPhoneNumber(
      queueItem.campaignId,
      queueItem.senderPhoneNumber,
      queueItem.platform,
    );
    if (newSenderPhoneNumber) {
      await RabbitMQQueueService.enqueue(
        queueItem.campaignId,
        queueItem.message,
        queueItem.recipientPhoneNumber,
        queueItem.platform,
        newSenderPhoneNumber,
      );
      return { success: true, message: 'Requeued with new sender phone number' };
    } else {
      throw new Error('No available phone numbers');
    }
  } else {
    throw new Error(result.error);
  }
}

module.exports = {
  processQueue,
  processSingleQueueItem,
};
