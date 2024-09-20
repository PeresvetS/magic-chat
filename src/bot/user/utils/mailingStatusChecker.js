// src/bot/user/utils/mailingStatusChecker.js

const { distributionService } = require('../../../services/mailing');
const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

async function checkMailingStatus(bot, msg, initialResult, phoneNumber) {
  const maxAttempts = 10;
  let attempts = 0;
  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Ждем 5 секунд между проверками
    const result =
      await distributionService.getDistributionResults(initialResult);

    if (Object.values(result).some((r) => r && typeof r === 'object' && Object.values(r).some(v => v && v.status === 'completed'))) {
      // Отправляем результаты пользователю
      let message = '';
      if (result.telegram && result.telegram.telegram && result.telegram.telegram.success) {
        message += `Тестовое сообщение успешно отправлено в Telegram на номер ${phoneNumber}\n`;
      }
      if (result.whatsapp && result.whatsapp.success) {
        message += `Тестовое сообщение успешно отправлено в WhatsApp на номер ${phoneNumber}\n`;
      }
      if (result.waba && result.waba.success) {
        message += `Тестовое сообщение успешно отправлено в WABA на номер ${phoneNumber}\n`;
      }
      if (result.tgwa && result.tgwa.success) {
        message += `Тестовое сообщение успешно отправлено в Telegram и/или WhatsApp на номер ${phoneNumber}\n`;
      }
      if (result.tgwaba && result.tgwaba.success) {
        message += `Тестовое сообщение успешно отправлено в Telegram и/или WABA на номер ${phoneNumber}\n`;
      }
      if (message === '') {
        message = `Не удалось отправить сообщение на номер ${phoneNumber}. Проверьте, доступен ли этот номер в мессенджерах.`;
      }
      bot.sendMessage(msg.chat.id, message);
      return;
    }
    attempts++;
  }
  bot.sendMessage(
    msg.chat.id,
    'Превышено время ожидания результатов отправки. Пожалуйста, проверьте статус отправки позже.',
  );
}

async function checkBulkDistributionStatus(bot, chatId, details, campaignId) {
  let completed = 0;
  let failed = 0;
  let pending = 0;
  const totalItems = details.length;
  const updateInterval = Math.max(Math.floor(totalItems / 10), 1);

  for (let i = 0; i < details.length; i++) {
    const detail = details[i];
    if (detail.status !== 'completed' && detail.status !== 'failed') {
      const result = await distributionService.getDistributionResults(detail.queueItems);
      
      const statuses = Object.values(result)
        .filter(platform => platform !== null)
        .map(platform => platform.status);
      
      if (statuses.includes('completed')) {
        completed++;
        detail.status = 'completed';
      } else if (statuses.length > 0 && statuses.every(status => status === 'failed')) {
        failed++;
        detail.status = 'failed';
      } else {
        pending++;
        detail.status = 'pending';
      }
    } else if (detail.status === 'completed') {
      completed++;
    } else if (detail.status === 'failed') {
      failed++;
    }

    if ((i + 1) % updateInterval === 0 || i === details.length - 1) {
      const progressMessage =
        `Прогресс отправки для кампании ${campaignId}:\n` +
        `Обработано: ${i + 1}/${totalItems}\n` +
        `Успешно отправлено: ${completed}\n` +
        `Не удалось отправить: ${failed}\n` +
        `В процессе: ${pending}`;
      await bot.sendMessage(chatId, progressMessage);
    }

    // Увеличьте задержку, чтобы не перегружать систему
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const finalMessage =
    `Рассылка для кампании ${campaignId} завершена.\n` +
    `Всего обработано: ${totalItems}\n` +
    `Успешно отправлено: ${completed}\n` +
    `Не удалось отправить: ${failed}\n` +
    `В процессе: ${pending}`;
  await bot.sendMessage(chatId, finalMessage);

  // Добавьте проверку на завершение всех отправок
  if (pending > 0) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await checkBulkDistributionStatus(bot, chatId, details, campaignId);
  }
}

module.exports = { checkMailingStatus, checkBulkDistributionStatus };
