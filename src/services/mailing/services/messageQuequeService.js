// src/services/mailing/services/messageQuequeService.js

const logger = require('../../../utils/logger');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');
const PhoneNumberManagerService = require('../../phone/src/PhoneNumberManagerService');
const { sendTelegramMessage, sendWhatsAppMessage, sendWABAMessage, sendTgAndWa, sendTgAndWABA } = require('./messageDistributionService');

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
        if (queueItem.ackFunction) queueItem.ackFunction();
        queueItem = null;
        continue;
      }

      logger.info(`Processing queue item ${queueItem.id} with campaignId ${queueItem.campaignId}`);

      try {
        // Обработка элемента очереди
        const result = await processSingleQueueItem(queueItem);
        await RabbitMQQueueService.markAsCompleted(queueItem, result);
      } catch (error) {
        logger.error(`Error processing queue item ${queueItem.id}:`, error);
        await RabbitMQQueueService.markAsFailed(queueItem, error.message);
      }

      queueItem = null;
    }
  }

  async function processSingleQueueItem(queueItem) {
    if (!queueItem || !queueItem.id || !queueItem.campaignId) {
      throw new Error('Invalid queue item');
    }

    let result;
    logger.info(`Processing queue item ${queueItem.recipientPhoneNumber} with  campaign_id ${queueItem.campaignId}`);
    const queueAgrs = {
      campaignId: queueItem.campaignId,
      senderPhoneNumber: queueItem.senderPhoneNumber,
      recipientPhoneNumber: queueItem.recipientPhoneNumber,
      message: queueItem.message,
      platform: queueItem.platform,
    };
    switch (queueItem.platform) {
      case 'telegram':
        result = await sendTelegramMessage(queueAgrs);
        break;
      case 'whatsapp':
        result = await sendWhatsAppMessage(queueAgrs);
        break;
      case 'waba':
        result = await sendWABAMessage(queueAgrs);
        break;
      case 'tgwa':
        result = await sendTgAndWa(queueAgrs);
        break;
      case 'tgwaba':
        result = await sendTgAndWABA(queueAgrs);
        break;
    }

    if (result.success) {
      await RabbitMQQueueService.markAsCompleted(queueItem.id, { [queueItem.platform]: result });
    
    } else {
      if (result.error === 'DAILY_LIMIT_REACHED') {
        const newSenderPhoneNumber = await PhoneNumberManagerService.switchToNextPhoneNumber(
          queueItem.campaign_id,
          queueItem.sender_phone_number,
          queueItem.platform
        );
        if (newSenderPhoneNumber) {
          await RabbitMQQueueService.enqueue(
            queueItem.campaign_id,
            queueItem.message,
            queueItem.recipient_phone_number,
            queueItem.platform,
            newSenderPhoneNumber
          );
        } else {
          await RabbitMQQueueService.markAsFailed(queueItem.id, 'No available phone numbers');
        }
      } else {
        await RabbitMQQueueService.markAsFailed(queueItem.id, result.error);
      }
    }

    return result;
  }

module.exports = {
  processQueue,
  processSingleQueueItem
};