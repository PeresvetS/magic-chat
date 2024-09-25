// src/services/mailing/services/messageQuequeService.js

const logger = require('../../../utils/logger');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');
const { phoneNumberService } = require('../../phone');
const PhoneNumberManagerService = require('../../phone/src/PhoneNumberManagerService');
const { delay, retryOperation } = require('../../../utils/helpers');
const {
  sendTelegramMessage,
  sendWhatsAppMessage,
  sendWABAMessage,
  sendTgAndWa,
  sendTgAndWABA,
} = require('./messageMailingService');
const { safeStringify } = require('../../../utils/helpers');
const { leadService } = require('../../leads');

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds

async function processQueue(initialQueueItem = null) {
  let queueItem = initialQueueItem;

  while (true) {
    try {
      if (!queueItem) {
        queueItem = await RabbitMQQueueService.dequeue('mailing');
      }

      if (!queueItem) {
        logger.debug('Queue is empty');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Пауза перед следующей проверкой
        continue;
      }

      logger.info(`Processing queue item ${queueItem.id} with campaignId ${queueItem.campaignId}`);

      const result = await processSingleQueueItem(queueItem);
      
      if (queueItem.ackFunction && typeof queueItem.ackFunction === 'function') {
        await queueItem.ackFunction(); // Подтверждаем обработку сообщения
        await RabbitMQQueueService.markAsCompleted(queueItem, result);
      } else {
        logger.warn('Invalid queue item or missing ackFunction:', queueItem);
      }
    } catch (error) {
      logger.error(`Error processing queue item ${queueItem?.id}:`, error);
      if (error.message.includes('unknown delivery tag')) {
        await RabbitMQQueueService.reconnect();
      } else if (error.message.includes('FLOOD_WAIT')) {
        await handleFloodWait(queueItem, error);
      } else if (queueItem?.nackFunction && typeof queueItem.nackFunction === 'function') {
        await RabbitMQQueueService.markAsFailed(queueItem, error.message);
        await queueItem.nackFunction();
      } else {
        logger.warn('Invalid queue item or missing nackFunction:', queueItem);
      }
    } finally {
      queueItem = null; // Всегда сбрасываем queueItem после обработки
    }
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

async function handlePeerFlood(queueItem, error) {
  await phoneNumberService.updatePhoneNumberBanStatus(queueItem.senderPhoneNumber, 'peer_flood');
}

async function processSingleQueueItem(queueItem) {
  if (!queueItem || !queueItem.id || !queueItem.campaignId) {
    throw new Error('Invalid queue item');
  }

  try {
    // Проверяем, не было ли сообщение уже отправлено
    const existingItem = await RabbitMQQueueService.getQueueItem(queueItem.id);
    if (existingItem && existingItem.status === 'completed') {
      logger.info(`Queue item ${queueItem.id} already processed. Skipping.`);
      return { success: true, status: 'already_processed' };
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

    try {
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

      logger.info(`Result of processing queue item ${queueItem.id}: ${safeStringify(result)}`);

      if (result.success || result.status === 'completed') {
        await RabbitMQQueueService.updateQueueItemStatus(queueItem.id, 'completed', result);
        await leadService.updateLeadStatusByPhone(queueItem.recipientPhoneNumber, 'SENT_MESSAGE');
        return { [queueItem.platform]: result };
      } else if (result.error === 'DAILY_LIMIT_REACHED' || result.error.includes('FLOOD_WAIT') || result.error.includes('PEER_FLOOD')) {
        const phoneNumberManager = new PhoneNumberManagerService();
        const newSenderPhoneNumber = await phoneNumberManager.switchToNextPhoneNumber(
          queueItem.campaignId,
          queueItem.senderPhoneNumber,
          queueItem.platform,
        );
        if (newSenderPhoneNumber) {
          logger.info(`Switching to new phone number ${newSenderPhoneNumber} for campaign ${queueItem.campaignId}, platform ${queueItem.platform}`);
          await RabbitMQQueueService.enqueue('mailing', {
            campaignId: queueItem.campaignId,
            message: queueItem.message,
            recipientPhoneNumber: queueItem.recipientPhoneNumber,
            platform: queueItem.platform,
            senderPhoneNumber: newSenderPhoneNumber,
          });

          await RabbitMQQueueService.updateQueueItemStatus(queueItem.id, 'requeued', { message: 'Requeued with new sender phone number' });
          return { success: true, message: 'Requeued with new sender phone number' };
        } else {
          throw new Error('No available phone numbers');
        }
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      logger.error(`Error processing queue item ${queueItem.id}:`, error);
      if (error.message.includes('FLOOD_WAIT')) {
        await handleFloodWait(queueItem, error);
      } else if (error.message.includes('PEER_FLOOD')) {
        await handlePeerFlood(queueItem, error);
      } else {
        await RabbitMQQueueService.updateQueueItemStatus(queueItem.id, 'failed', { error: error.message });
        throw error;
      }
    }
  } catch (error) {
    logger.error(`Error processing queue item ${queueItem.id}:`, error);
    throw error;
  }
}

module.exports = {
  processQueue,
  processSingleQueueItem,
};
