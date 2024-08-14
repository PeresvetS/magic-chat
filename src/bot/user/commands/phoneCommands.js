const { 
  addPhoneNumber, 
  removePhoneNumber, 
  getPhoneNumberInfo, 
  getUserPhoneNumbers,
  updatePhoneNumberStatus,
  setPhoneNumberLimit,
  setPhoneAuthenticated
} = require('../../../services/phone/phoneNumberService');
const { getUserByTgId } = require('../../../services/user');
const TelegramSessionService = require('../../../services/telegram/telegramSessionService');
const logger = require('../../../utils/logger');

module.exports = {
  '/addphone': async (bot, msg, match) => {
    
    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;

    logger.info(`Addphone command called by user ${userId}`);
    
    // Извлекаем номер телефона из текста сообщения
    const fullText = msg.text;
    const phoneNumber = fullText.split(' ')[1]; // Получаем второй элемент после разделения по пробелу
    
    logger.info(`Extracted phone number: ${phoneNumber}`);

    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды. Например: /addphone +79123456789');
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

      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} успешно ${result.is_new ? 'добавлен' : 'обновлен'}. Выберите способ аутентификации:`, {
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

'/removephone': async (bot, msg, match) => {
  const user = await getUserByTgId(msg.from.id);
  const userId = user.id;
    logger.info(`Removephone command called by user ${userId}`);
    
    // Извлекаем номер телефона из текста сообщения
    const fullText = msg.text;
    const phoneNumber = fullText.split(' ')[1]; // Получаем второй элемент после разделения по пробелу
    
    logger.info(`Extracted phone number for removal: ${phoneNumber}`);

    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды. Например: /removephone +79123456789');
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

  '/listphones': async (bot, msg) => {
    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Listphones command called by user ${userId}`);
    try {
      const phoneNumbers = await getUserPhoneNumbers(userId);
      logger.info(`Retrieved ${phoneNumbers.length} phone numbers for user ${userId}`);
      if (phoneNumbers.length === 0) {
        bot.sendMessage(msg.chat.id, 'У вас нет добавленных номеров телефонов.');
      } else {
        const phoneList = phoneNumbers.map(phone => 
          `${phone.phone_number}${phone.is_authenticated ? '' : ' (не аутентифицирован, используйте /addphone)'}`
        ).join('\n');
        bot.sendMessage(msg.chat.id, `Ваши номера телефонов:\n${phoneList}`);
      }
    } catch (error) {
      logger.error(`Error listing phone numbers for user ${userId}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при получении списка номеров: ${error.message}`);
    }
  },

  '/phoneinfo': async (bot, msg, match) => {
    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Phoneinfo command called by user ${userId}`);
    const phoneNumber = match[1];
    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды. Например: /phoneinfo +79123456789');
      return;
    }
    logger.info(`Attempting to get info for phone number ${phoneNumber}`);
    try {
      const info = await getPhoneNumberInfo(phoneNumber);
      logger.info(`Retrieved info for phone number ${phoneNumber}`);
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
      logger.error(`Error getting info for phone number ${phoneNumber}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о номере: ${error.message}`);
    }
  },

  '/banphone': async (bot, msg, match) => {
    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Banphone command called by user ${userId}`);
    const [phoneNumber, banType] = match[1].split(' ');
    if (!phoneNumber || !banType) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона и тип бана. Например: /banphone +79123456789 spam');
      return;
    }
    logger.info(`Attempting to ban phone number ${phoneNumber} with type ${banType}`);
    try {
      await updatePhoneNumberStatus(phoneNumber, true, banType);
      logger.info(`Phone number ${phoneNumber} banned successfully`);
      bot.sendMessage(msg.chat.id, `Номер телефона ${phoneNumber} успешно забанен с типом: ${banType}`);
    } catch (error) {
      logger.error(`Error banning phone number ${phoneNumber}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при бане номера: ${error.message}`);
    }
  },

  '/unbanphone': async (bot, msg, match) => {
    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Unbanphone command called by user ${userId}`);
    const phoneNumber = match[1];
    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона. Например: /unbanphone +79123456789');
      return;
    }
    logger.info(`Attempting to unban phone number ${phoneNumber}`);
    try {
      await updatePhoneNumberStatus(phoneNumber, false);
      logger.info(`Phone number ${phoneNumber} unbanned successfully`);
      bot.sendMessage(msg.chat.id, `Номер телефона ${phoneNumber} успешно разбанен.`);
    } catch (error) {
      logger.error(`Error unbanning phone number ${phoneNumber}:`, error);
      bot.sendMessage(msg.chat.id, `Ошибка при разбане номера: ${error.message}`);
    }
  },

  '/setphonelimit': async (bot, msg, match) => {
    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Setphonelimit command called by user ${userId}`);
    const [phoneNumber, dailyLimit, totalLimit] = match[1].split(' ');
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