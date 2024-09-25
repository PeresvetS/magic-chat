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


module.exports = { checkMailingStatus };
