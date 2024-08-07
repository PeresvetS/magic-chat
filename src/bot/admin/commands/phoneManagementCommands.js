// src/bot/admin/commands/phoneManagementCommands.js

const { updatePhoneNumberStatus, setPhoneNumberLimit, getPhoneNumberInfo } = require('../../../services/phoneNumberService');

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
      message += `Пользователь: ${info.user_id}\n`;
      message += `Премиум: ${info.is_premium ? 'Да' : 'Нет'}\n`;
      message += `Забанен: ${info.is_banned ? 'Да' : 'Нет'}\n`;
      if (info.is_banned) {
        message += `Тип бана: ${info.ban_type}\n`;
      }
      message += `Отправлено сообщений сегодня: ${info.messages_sent_today}\n`;
      message += `Отправлено сообщений всего: ${info.messages_sent_total}\n`;
      message += `Охвачено контактов сегодня: ${info.contacts_reached_today}\n`;
      message += `Охвачено контактов всего: ${info.contacts_reached_total}\n`;
      message += `Дневной лимит: ${info.daily_limit}\n`;
      message += `Общий лимит: ${info.total_limit || 'Не установлен'}\n`;
      message += `Добавлен: ${info.created_at}\n`;
      message += `Последнее обновление: ${info.updated_at}`;
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о номере: ${error.message}`);
    }
  }
};