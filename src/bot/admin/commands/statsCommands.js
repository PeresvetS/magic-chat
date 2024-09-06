// src/bot/admin/commands/statsCommands.js

const { getGlobalStats } = require('../../../services/stats/statsService');

module.exports = {
  '/global_stats': async (bot, msg) => {
    try {
      const stats = await getGlobalStats();
      bot.sendMessage(
        msg.chat.id,
        `Глобальная статистика:\n${JSON.stringify(stats, null, 2)}`,
      );
    } catch (error) {
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при получении глобальной статистики: ${error.message}`,
      );
    }
  },
};
