// src/bot/admin/commands/phoneManagementCommands.js

const { updatePhoneNumberStatus, setPhoneNumberLimit, getPhoneNumberInfo } = require('../../../services/phone').phoneNumberService;

module.exports = {
  '/banphone ([+]?[0-9]+) (temporary|permanent)': async (bot, msg, match) => {
    const [, phoneNumber, banType] = match;
    try {
      await updatePhoneNumberStatus(phoneNumber, true, banType);
      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} забанен (тип: ${banType}).`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при бане номера: ${error.message}`);
    }
  },

  '/unbanphone ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      await updatePhoneNumberStatus(phoneNumber, false);
      bot.sendMessage(msg.chat.id, `Бан для номера ${phoneNumber} снят.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при снятии бана: ${error.message}`);
    }
  },

  '/setphonelimit ([+]?[0-9]+) (\\d+) (\\d+)?': async (bot, msg, match) => {
    const [, phoneNumber, dailyLimit, totalLimit] = match;
    try {
      await setPhoneNumberLimit(phoneNumber, parseInt(dailyLimit), totalLimit ? parseInt(totalLimit) : null);
      bot.sendMessage(msg.chat.id, `Установлены лимиты для номера ${phoneNumber}: ежедневный - ${dailyLimit}, общий - ${totalLimit || 'не установлен'}.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при установке лимитов: ${error.message}`);
    }
  },

  '/phonedetails ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      const info = await getPhoneNumberInfo(phoneNumber);
      let message = `Детальная информация о номере ${phoneNumber}:\n`;
      message += `Пользователь: ${info.id}\n`;
      message += `Премиум: ${info.isPremium ? 'Да' : 'Нет'}\n`;
      message += `Забанен: ${info.isBanned ? 'Да' : 'Нет'}\n`;
      if (info.is_banned) {
        message += `Тип бана: ${info.banType}\n`;
      }
      message += `Отправлено сообщений в Telegram сегодня: ${info.telegramMessagesSentToday}\n`;
      message += `Отправлено сообщений в WhatsApp сегодня: ${info.whatsappMessagesSentToday}\n`;
      message += `Отправлено сообщений в Telegram всего: ${info.telegramMessagesSentTotal}\n`;
      message += `Отправлено сообщений в WhatsApp всего: ${info.whatsappMessagesSentTotal}\n`;
      message += `Охвачено контактов сегодня: ${info.contactsReachedToday}\n`;
      message += `Охвачено контактов всего: ${info.contactsReachedTotal}\n`;
      message += `Дневной лимит: ${info.dailyLimit}\n`;
      message += `Общий лимит: ${info.totalLimit || 'Не установлен'}\n`;
      message += `Добавлен: ${info.createdAt}\n`;
      message += `Последнее обновление: ${info.updatedAt}`;
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о номере: ${error.message}`);
    }
  }
};