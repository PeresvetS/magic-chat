// src/bot/user/commands/accountCommands.js

const { getAccountInfo, getSubscriptionInfo } = require('../../../services/user/accountService');

module.exports = {
  '/accountinfo': async (bot, msg) => {
    try {
      const info = await getAccountInfo(msg.from.id);
      bot.sendMessage(msg.chat.id, `Информация об аккаунте:\n${JSON.stringify(info, null, 2)}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации об аккаунте: ${error.message}`);
    }
  },

  '/subscriptioninfo': async (bot, msg) => {
    try {
      const info = await getSubscriptionInfo(msg.from.id);
      bot.sendMessage(msg.chat.id, `Информация о подписке:\n${JSON.stringify(info, null, 2)}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о подписке: ${error.message}`);
    }
  }
};