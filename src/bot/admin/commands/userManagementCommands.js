// src/bot/admin/commands/userManagementCommands.js

const { banUser, unbanUser, getUserInfo, getAllUsers } = require('../../../services/user');
const logger = require('../../../utils/logger');

module.exports = {
  '/banuser ([\\w\\.]+)': async (bot, msg, match) => {
    const [, userIdentifier] = match;
    try {
      await banUser(userIdentifier);
      bot.sendMessage(msg.chat.id, `Пользователь ${userIdentifier} забанен.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при бане пользователя: ${error.message}`);
    }
  },

  '/unbanuser ([\\w\\.]+)': async (bot, msg, match) => {
    const [, userIdentifier] = match;
    try {
      await unbanUser(userIdentifier);
      bot.sendMessage(msg.chat.id, `Пользователь ${userIdentifier} разбанен.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при разбане пользователя: ${error.message}`);
    }
  },

  '/userinfo ([\\w\\.]+)': async (bot, msg, match) => {
    const [, userIdentifier] = match;
    try {
      const info = await getUserInfo(userIdentifier);
      bot.sendMessage(msg.chat.id, `Информация о пользователе:\n${JSON.stringify(info, null, 2)}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о пользователе: ${error.message}`);
    }
  },
  
  '/userslist': async (bot, msg) => {
    try {
      const users = await getAllUsers();
      let message = 'Список пользователей:\n\n';
      users.forEach(user => {
        message += `ID: ${user.id}\n`;
        message += `Telegram ID: ${user.telegram_id}\n`;
        message += `Username: ${user.username || 'Не указан'}\n`;
        message += `Имя: ${user.first_name || 'Не указано'}\n`;
        message += `Фамилия: ${user.last_name || 'Не указана'}\n`;
        message += `Забанен: ${user.is_banned ? 'Да' : 'Нет'}\n`;
        message += `Зарегистрирован: ${user.registered_at}\n\n`;
      });
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      logger.error('Error in users list command:', error);
      bot.sendMessage(msg.chat.id, `Произошла ошибка при получении списка пользователей: ${error.message}`);
    }
  },
};