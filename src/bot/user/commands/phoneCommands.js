// src/bot/user/commands/phoneCommands.js

const { addPhoneNumber, removePhoneNumber, getPhoneNumberInfo } = require('../../../services/phoneNumberService');
const telegramSessionService = require('../../../services/phone/telegramSessionService');


module.exports = {
  '/addphone ([+]?[0-9]+)': async (bot, msg, match) => {
    const phoneNumber = match[1];
    try {
      await addPhoneNumber(msg.from.id, phoneNumber);
      
      const keyboard = {
        inline_keyboard: [
          [{ text: 'Ввести код', callback_data: `auth_code_${phoneNumber}` }],
          [{ text: 'Сканировать QR-код', callback_data: `auth_qr_${phoneNumber}` }]
        ]
      };

      bot.sendMessage(msg.chat.id, `Выберите способ аутентификации для номера ${phoneNumber}:`, {
        reply_markup: JSON.stringify(keyboard)
      });
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при добавлении номера: ${error.message}`);
    }
  },

  '/removephone ([+]?[0-9]+)': async (bot, msg, match) => {
    const phoneNumber = match[1];
    try {
      await removePhoneNumber(msg.from.id, phoneNumber);
      bot.sendMessage(msg.chat.id, `Номер телефона ${phoneNumber} успешно удален.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при удалении номера: ${error.message}`);
    }
  },

  '/phoneinfo ([+]?[0-9]+)': async (bot, msg, match) => {
    const phoneNumber = match[1];
    try {
      const info = await getPhoneNumberInfo(phoneNumber);
      let message = `Информация о номере ${phoneNumber}:\n`;
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
      message += `Общий лимит: ${info.total_limit || 'Не установлен'}`;
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о номере: ${error.message}`);
    }
  }
};
