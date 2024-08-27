// src/bot/user/commands/phoneCommands.js

const { 
  addPhoneNumber, 
  removePhoneNumber, 
  getPhoneNumberInfo, 
  getUserPhoneNumbers,
  updatePhoneNumberStatus,
  setPhoneNumberLimit
} = require('../../../services/phone').phoneNumberService;
const { userService } = require('../../../services/user');
const { TelegramSessionService } = require('../../../services/telegram');
const logger = require('../../../utils/logger');

module.exports = {
  '/add_phone ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;

    logger.info(`Extracted phone number: ${phoneNumber}`);

    const user = await userService.getUserByTgId(msg.from.id);
    const userId = user.id;

    logger.info(`Addphone command called by user ${userId}`);
    
    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды. Например: /add_phone +79123456789');
      return;
    }
    
    logger.info(`Attempting to add/update phone number ${phoneNumber} for user ${userId}`);
    
    try {
      const result = await addPhoneNumber(userId, phoneNumber);
      logger.info(`Phone number ${phoneNumber} added/updated successfully for user ${userId}`);
      
      const keyboard = {
        inline_keyboard: [
          [{ text: 'Ввести код', callback_data: `auth_code_${phoneNumber}` }],
          [{ text: 'Сканировать QR-код', callback_data: `auth_qr_${phoneNumber}` }]
        ]
      };

      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} успешно ${result.isNew ? 'добавлен' : 'обновлен'}. Выберите способ аутентификации:`, {
        reply_markup: JSON.stringify(keyboard)
      });
    } catch (error) {
      logger.error(`Error adding/updating phone number ${phoneNumber} for user ${userId}:`, error);
      if (error.message.includes('Неверный формат номера телефона')) {
        bot.sendMessage(msg.chat.id, `Ошибка: ${error.message} Пожалуйста, убедитесь, что номер начинается с + и содержит от 7 до 15 цифр.`);
      } else {
        bot.sendMessage(msg.chat.id, `Ошибка при добавлении/обновлении номера: ${error.message}`);
      }
    }
  },

'/remove_phone ([+]?[0-9]+)': async (bot, msg, match) => {
   const [, phoneNumber] = match;

   logger.info(`Extracted phone number: ${phoneNumber}`);

   const user = await userService.getUserByTgId(msg.from.id);
   const userId = user.id;
    logger.info(`Remove_phone command called by user ${userId}`);

    logger.info(`Extracted phone number for removal: ${phoneNumber}`);

    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды. Например: /remove_phone +79123456789');
      return;
    }
    
    logger.info(`Attempting to remove phone number ${phoneNumber} for user ${userId}`);
    
    try {
      await removePhoneNumber(userId, phoneNumber);
      logger.info(`Phone number ${phoneNumber} removed successfully for user ${userId}`);
      // Разрыв сессии при удалении номера
      await TelegramSessionService.disconnectSession(phoneNumber);
      bot.sendMessage(msg.chat.id, `Номер телефона ${phoneNumber} успешно удален и сессия разорвана.`);
    } catch (error) {
      logger.error(`Error removing phone number ${phoneNumber} for user ${userId}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при удалении номера: ${error.message}`);
    }
  },

'/list_phones': async (bot, msg) => {
  try {
    const user = await userService.getUserByTgId(msg.from.id);
    if (!user) {
      bot.sendMessage(msg.chat.id, 'Пользователь не найден.');
      return;
    }
    const userId = user.id;
    logger.info(`Listphones command called by user ${userId}`);
    
    const phoneNumbers = await getUserPhoneNumbers(userId);
    logger.info(`Retrieved ${phoneNumbers.length} phone numbers for user ${userId}`);
    
    if (phoneNumbers.length === 0) {
      bot.sendMessage(msg.chat.id, 'У вас нет добавленных номеров телефонов.');
      return;
    } 
    const phoneList = phoneNumbers.map(phone => 
      `${phone.phoneNumber} ${phone.isAuthenticated ? 'аунтифицирован' : ' (не аутентифицирован, используйте /add_phone)'}`
    ).join('\n');
    bot.sendMessage(msg.chat.id, `Ваши номера телефонов:\n${phoneList}`);

  } catch (error) {
    logger.error(`Error listing phone numbers:`, error);
    bot.sendMessage(msg.chat.id, `Ошибка при получении списка номеров: ${error.message}`);
  }
},

  '/phone_stats ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;

    logger.info(`Extracted phone number: ${phoneNumber}`);

    const user = await userService.getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Phoneinfo command called by user ${userId}`);

    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды. Например: /phone_info +79123456789');
      return;
    }
    logger.info(`Attempting to get info for phone number ${phoneNumber}`);
    try {
      const info = await getPhoneNumberInfo(phoneNumber);
      logger.info(`Retrieved info for phone number ${phoneNumber}`);
      let message = `Информация о номере ${phoneNumber}:\n`;
      message += `Премиум: ${info.isPremium ? 'Да' : 'Нет'}\n`;
      message += `Забанен: ${info.isBanned ? 'Да' : 'Нет'}\n`;
      message += `Аутентифицирован: ${info.isAuthenticated ? 'Да' : 'Нет'}\n`;
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
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      logger.error(`Error getting info for phone number ${phoneNumber}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о номере: ${error.message}`);
    }
  },

  '/set_phone_limit ([+]?[0-9]+) (\\d+) (\\d+)?': async (bot, msg, match) => {

    const [, phoneNumber, dailyLimit, totalLimit] = match;

    const user = await userService.getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Setphonelimit command called by user ${userId}`);
  
    if (!phoneNumber || !dailyLimit) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона и дневной лимит. Например: /setphonelimit +79123456789 100');
      return;
    }
    logger.info(`Attempting to set limits for phone number ${phoneNumber}: daily=${dailyLimit}, total=${totalLimit || 'not set'}`);
    try {
      await setPhoneNumberLimit(phoneNumber, parseInt(dailyLimit), totalLimit ? parseInt(totalLimit) : null);
      logger.info(`Limits set successfully for phone number ${phoneNumber}`);
      bot.sendMessage(msg.chat.id, `Лимиты для номера ${phoneNumber} успешно установлены. Дневной лимит: ${dailyLimit}, Общий лимит: ${totalLimit || 'не установлен'}`);
    } catch (error) {
      logger.error(`Error setting limits for phone number ${phoneNumber}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при установке лимитов: ${error.message}`);
    }
  }
};