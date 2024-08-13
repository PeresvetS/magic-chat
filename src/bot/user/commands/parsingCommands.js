// src/bot/user/commands/parsingCommands.js

// const { startParsing, stopParsing, getParsingStatus } = require('../../../services/parsing/parsingService');

module.exports = {
  '/startparsing (.+)': async (bot, msg, match) => {
    const [, groupUsername] = match;
    try {
      // await startParsing(msg.from.id, groupUsername);
      bot.sendMessage(msg.chat.id, `Начат парсинг группы ${groupUsername}.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при начале парсинга: ${error.message}`);
    }
  },

  '/stopparsing': async (bot, msg) => {
    try {
      // await stopParsing(msg.from.id);
      bot.sendMessage(msg.chat.id, 'Парсинг остановлен.');
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при остановке парсинга: ${error.message}`);
    }
  },

  '/parsingstatus': async (bot, msg) => {
    try {
      // const status = await getParsingStatus(msg.from.id);
      bot.sendMessage(msg.chat.id, `Статус парсинга: ${status}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении статуса парсинга: ${error.message}`);
    }
  }
};