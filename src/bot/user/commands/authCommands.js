// src/bot/user/commands/authCommands.js

const { authenticate } = require('../../../services/auth/authService');
const logger = require('../../../utils/logger');

module.exports = {
  '/reauth': async (bot, msg) => {
    bot.sendMessage(
      msg.chat.id,
      'Начинаем процесс повторной аутентификации...',
    );
    try {
      await authenticate();
      bot.sendMessage(
        msg.chat.id,
        'Повторная аутентификация успешно завершена.',
      );
    } catch (error) {
      logger.error('Error during re-authentication:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при повторной аутентификации.',
      );
    }
  },
};
