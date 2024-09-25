// src/services/mailing/checkers/bulkDistributionChecker.js

const distributionService = require('../services/messageDistributionService');
const logger = require('../../../utils/logger');

class BulkDistributionChecker {
  constructor(bot, chatId, details, campaignId) {
    this.bot = bot;
    this.chatId = chatId;
    this.details = details;
    this.campaignId = campaignId;
    this.totalItems = details.length;
    this.lastProgressUpdate = 0;
    this.checkInterval = 10000; // 10 seconds
    this.maxChecks = 60; // 10 minutes total
  }

  async start() {
    let checkCount = 0;
    let lastStatus = null;
    while (checkCount < this.maxChecks) {
      const status = await this.checkStatus();
      if (this.isStatusChanged(lastStatus, status)) {
        this.sendProgressUpdate(status);
        lastStatus = { ...status };
      }
      if (status.pending === 0 && status.completed + status.failed === this.totalItems) {
        this.sendFinalStatus(status);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
      checkCount++;
    }
    this.sendTimeoutMessage();
  }

  isStatusChanged(lastStatus, currentStatus) {
    if (!lastStatus) return true;
    return (
      lastStatus.completed !== currentStatus.completed ||
      lastStatus.failed !== currentStatus.failed ||
      lastStatus.pending !== currentStatus.pending
    );
  }

  async checkStatus() {
    try {
      const result = await distributionService.getDistributionResults(this.details.map(d => d.queueItems).flat());
      let completed = 0;
    let failed = 0;
    let pending = 0;

    Object.values(result).forEach(platform => {
      if (platform) {
          completed += platform.completed || 0;
          failed += platform.failed || 0;
          pending += platform.pending || 0;
        }   
      });

      return { completed, failed, pending };
    } catch (error) {
      logger.error('Error checking distribution status:', error);
      return { completed: 0, failed: 0, pending: 0 };
    }
  }

  sendProgressUpdate(status) {
    const message = 
      `Прогресс отправки для кампании ${this.campaignId}:\n` +
      `Обработано: ${status.completed + status.failed}/${this.totalItems}\n` +
      `Успешно отправлено: ${status.completed}\n` +
      `Не удалось отправить: ${status.failed}\n` +
      `В процессе: ${status.pending}`;
    this.bot.sendMessage(this.chatId, message);
  }

  sendFinalStatus(status) {
    const message = 
      `Рассылка для кампании ${this.campaignId} завершена.\n` +
      `Всего обработано: ${this.totalItems}\n` +
      `Успешно отправлено: ${status.completed}\n` +
      `Не удалось отправить: ${status.failed}\n` +
      `В процессе: ${status.pending}`;
    this.bot.sendMessage(this.chatId, message);
  }

  sendTimeoutMessage() {
    this.bot.sendMessage(
      this.chatId,
      'Превышено время ожидания результатов отправки. Пожалуйста, проверьте статус отправки позже.'
    );
  }
}

module.exports = BulkDistributionChecker;