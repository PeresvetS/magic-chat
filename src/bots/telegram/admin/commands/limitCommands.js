// src/bot/admin/commands/limitCommands.js

const { setLimit, getLimits } = require('../../../../services/user').limitService;

module.exports = {
  '/set_limit ([\\w\\.]+) (parsing|phones|campaigns|contacts|leads) (\\d+)':
    async (bot, msg, match) => {
      const [, userIdentifier, limitType, limitValue] = match;
      try {
        await setLimit(userIdentifier, limitType, parseInt(limitValue));
        bot.sendMessage(
          msg.chat.id,
          `Лимит ${limitType} для ${userIdentifier} установлен на ${limitValue}.`,
        );
      } catch (error) {
        bot.sendMessage(
          msg.chat.id,
          `Ошибка при установке лимита: ${error.message}`,
        );
      }
    },

  '/get_limits ([\\w\\.]+)': async (bot, msg, match) => {
    const [, userIdentifier] = match;
    try {
      const limits = await getLimits(userIdentifier);
      bot.sendMessage(
        msg.chat.id,
        `Лимиты для ${userIdentifier}:\n${JSON.stringify(limits, null, 2)}`,
      );
    } catch (error) {
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при получении лимитов: ${error.message}`,
      );
    }
  },
};
