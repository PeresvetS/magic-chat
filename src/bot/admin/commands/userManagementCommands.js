// src/bot/admin/commands/userManagementCommands.js

const { banUser, unbanUser, getUserInfo } = require('../../../services/user/userManagementService');

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
  }
};