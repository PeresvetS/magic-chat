// src/services/mailing/services/messageDistributionService.js

const MessagingPlatformChecker = require('../checkers/MessagingPlatformChecker');
const logger = require('../../../utils/logger');
const PhoneNumberManagerService = require('../../phone/src/PhoneNumberManagerService');
const { campaignsMailingService } = require('../../campaign');
const RabbitMQQueueService = require('../../queue/rabbitMQQueueService');

class MessageDistributionService {
  constructor() {
    this.lastMessageTimes = new Map();
    this.RATE_LIMIT_SECONDS = 60; // 1 минута
    this.phoneNumberManager = new PhoneNumberManagerService();
  }

  async distributeMessage(
    campaignId,
    message,
    phoneNumber,
    platformPriority = 'telegram',
    mode = 'one',
  ) {
    if (!campaignId) {
      logger.error('Campaign ID is undefined');
      throw new Error('Campaign ID is required for message distribution');
    }

    logger.info(
      `Distributing message to ${phoneNumber} with priority ${platformPriority} and mode ${mode}`,
    );
    const strPhoneNumber = String(phoneNumber);
    try {
      const attachedPhones =
        await campaignsMailingService.getCampaignPhoneNumbers(campaignId);
      if (attachedPhones.length === 0) {
        throw new Error(`Campaign ${campaignId} has no attached phone numbers`);
      }

      if (!message) {
        throw new Error(
          `Campaign ${campaignId} has no message for distribution`,
        );
      }

      const messagingPlatformChecker = new MessagingPlatformChecker(campaignId);
      // Инициализируем MessagingPlatformChecker перед использованием
      await messagingPlatformChecker.initialize();

      const platforms = await messagingPlatformChecker.choosePlatform(
        campaignId,
        strPhoneNumber,
        platformPriority,
        mode,
      );
      
      logger.info(
        `Distributing message to ${strPhoneNumber} with platforms ${platforms}`,
      );
      
      const results = {
        strPhoneNumber,
        telegram: null,
        whatsapp: null,
        waba: null,
        tgwa: null,
        tgwaba: null,
      };

      for (const platform of platforms.split(',')) {
        const phoneNumberManager = new PhoneNumberManagerService();
        let senderPhoneNumber = await phoneNumberManager.getNextAvailablePhoneNumber(
          campaignId,
          platform,
        );
        if (!senderPhoneNumber) {
          logger.warn(
            `No available phone numbers for ${platform} in campaign ${campaignId}`,
          );
          continue;
        }

        try {
          logger.info(
            `Enqueuing message for ${platform} with campaignId ${campaignId}, sender ${senderPhoneNumber}`,
          );
          const queueItem = await RabbitMQQueueService.enqueue('mailing', {
            campaignId,
            message,
            recipientPhoneNumber: strPhoneNumber,
            platform,
            senderPhoneNumber,
          });
          results[platform] = { queueItemId: queueItem.id, status: 'queued' };
          logger.info(`Message queued for ${platform}: ${queueItem.id}`);
        } catch (error) {
          logger.error(`Error enqueueing message for ${platform}:`, error);
          results[platform] = { error: error.message, status: 'failed' };
          
          // Попробуем сменить номер и повторить попытку
          senderPhoneNumber = await phoneNumberManager.switchToNextPhoneNumber(
            campaignId,
            senderPhoneNumber,
            platform,
          );
          if (senderPhoneNumber) {
            try {
              const queueItem = await RabbitMQQueueService.enqueue('mailing', {
                campaignId,
                message,
                recipientPhoneNumber: strPhoneNumber,
                platform,
                senderPhoneNumber,
              });
              results[platform] = { queueItemId: queueItem.id, status: 'queued' };
              logger.info(`Message queued for ${platform} with new sender number: ${queueItem.id}`);
            } catch (retryError) {
              logger.error(`Error enqueueing message for ${platform} with new sender number:`, retryError);
              results[platform] = { error: retryError.message, status: 'failed' };
            }
          }
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error distributing message to ${strPhoneNumber}:`, error);
      throw error;
    }
  }

  async bulkDistribute(
    campaignId,
    contacts,
    message,
    priorityPlatform = null,
    mode = 'both',
  ) {
    logger.info(`Starting bulk distribution for campaign ${campaignId}`);
    const results = {
      totalContacts: contacts.length,
      queuedSends: 0,
      failedEnqueues: 0,
      details: [],
    };

    const campaign = await campaignsMailingService.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    if (!campaign.message && !message) {
      throw new Error(`Campaign ${campaignId} has no message for distribution`);
    }
    const distributionMessage = message || campaign.message;
    const distributionPriority = priorityPlatform || campaign.platformPriority;

    for (const contact of contacts) {
      try {
        const result = await this.distributeMessage(
          campaignId,
          distributionMessage,
          contact.phoneNumber,
          distributionPriority,
          mode,
        );

        results.queuedSends++;
        results.details.push({
          phoneNumber: contact.phoneNumber,
          status: 'queued',
          queueItems: result,
        });

        // Добавляем небольшую задержку меду постановками в очередь
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(
          `Error enqueueing message for ${contact.phoneNumber}:`,
          error,
        );
        results.failedEnqueues++;
        results.details.push({
          phoneNumber: contact.phoneNumber,
          status: 'failed',
          error: error.message,
        });
      }
    }

    logger.info(
      `Bulk distribution queuing completed for campaign ${campaignId}. Results:`,
      results,
    );
    return results;
  }

  isSuccessfulSend(result) {
    return Object.values(result).some(
      (platformResult) =>
        platformResult &&
        (platformResult.success ||
          (platformResult.status && platformResult.status === 'completed'))
    );
  }

  getSuccessfulPlatform(result) {
    for (const platform of ['telegram', 'whatsapp', 'waba', 'tgwa', 'tgwaba']) {
      if (
        result[platform] &&
        (result[platform].success ||
          (result[platform].status && result[platform].status === 'completed'))
      ) {
        return platform;
      }
    }
    return 'unknown';
  }

  getErrorMessage(result) {
    for (const platform of ['telegram', 'whatsapp', 'waba', 'tgwa', 'tgwaba']) {
      if (result[platform] && result[platform].error) {
        return result[platform].error;
      }
    }
    return 'Unknown error';
  }

  async sendMessageToLead(lead, user) {
    const cacheKey = `${lead.phone}_${user.id}`;
    const now = Date.now();
    const lastSentTime = this.lastMessageTimes.get(cacheKey);

    if (lastSentTime && now - lastSentTime < this.RATE_LIMIT_SECONDS * 1000) {
      logger.info(
        `Сообщение для номера ${lead.phone} уже было отправлено недавно. Пропускаем отправку.`,
      );
      return;
    }

    const activeCampaign = await campaignsMailingService.getActiveCampaign(
      user.telegramId,
    );
    if (activeCampaign && activeCampaign.message) {
      try {
        logger.info(
          `Отправляем автоматическое сообщение для лида ${lead.phone} в кампанию ${activeCampaign.id} с приоритетом ${activeCampaign.platformPriority} сообщение ${activeCampaign.message}`,
        );
        const result = await this.distributeMessage(
          activeCampaign.id,
          activeCampaign.message,
          lead.phone,
          activeCampaign.platformPriority,
          'one',
        );

        if (result.telegram && result.telegram.success) {
          logger.info(
            `Автоматическое сообщение отправлено в Telegram для лида ${lead.id}`,
          );
          this.lastMessageTimes.set(cacheKey, now);
        } else if (result.whatsapp && result.whatsapp.success) {
          logger.info(
            `Автоматическое сообщение отправлено в WhatsApp для лида ${lead.id}`,
          );
          this.lastMessageTimes.set(cacheKey, now);
        } else if (result.tgwa && result.tgwa.success) {
          logger.info(
            `Автоматическое сообщение отправлено в Telegram и/или WhatsApp для лида ${lead.id}`,
          );
          this.lastMessageTimes.set(cacheKey, now);
        } else {
          logger.warn(
            `Не удалось отправить автоматическое сообщение для лида ${lead.id}`,
          );
        }
      } catch (error) {
        logger.error('Ошибка при отправке автоматического сообщения:', error);
      }
    } else {
      logger.info(
        'Нет активной кампании или сообщения для автоматической отправки',
      );
    }
  }

  clearOldEntries() {
    const now = Date.now();
    for (const [key, time] of this.lastMessageTimes.entries()) {
      if (now - time > this.RATE_LIMIT_SECONDS * 1000) {
        this.lastMessageTimes.delete(key);
      }
    }
  }

  async getDistributionResults(results) {
    const updatedResults = { ...results };

    for (const platform of Object.keys(updatedResults)) {
      if (updatedResults[platform] && updatedResults[platform].queueItemId) {
        const queueItem = await RabbitMQQueueService.getQueueItem(
          updatedResults[platform].queueItemId
        );

        if (queueItem) {
          updatedResults[platform] = {
            status: queueItem.status,
            success: queueItem.status === 'completed',
            result: queueItem.result,
            error: queueItem.status === 'failed' ? queueItem.result : null,
          };

          // Если result - это строка, пытаемся разобрать её как JSON
          if (typeof updatedResults[platform].result === 'string') {
            try {
              updatedResults[platform].result = JSON.parse(updatedResults[platform].result);
            } catch (e) {
              logger.warn(`Failed to parse result as JSON for queue item ${updatedResults[platform].queueItemId}: ${e.message}`);
              // Оставляем result как есть, если не удалось разобрать JSON
            }
          }
        } else {
          logger.warn(
            `Queue item not found for ${platform}: ${updatedResults[platform].queueItemId}`,
          );
          updatedResults[platform] = { status: 'unknown' };
        }
      } else {
        // Если queueItemId отсутствует, оставляем платформу как null
        updatedResults[platform] = null;
      }
    }

    return updatedResults;
  }
}

module.exports = new MessageDistributionService();
