// src/bot/admin/commands/helpCommands.js

module.exports = {
    '/help': async (bot, msg) => {
      const helpText = `
  Доступные команды администратора:
  /addsubscription [user] [duration] [days|months] [repeat|once] - Добавить подписку
  /subscriptioninfo [user] - Информация о подписке
  /updatesubscription [user] [duration] [days|months] - Обновить подписку
  /banuser [user] - Забанить пользователя
  /unbanuser [user] - Разбанить пользователя
  /userinfo [user] - Информация о пользователе
  /setlimit [user] [type] [value] - Установить лимит
  /getlimits [user] - Получить лимиты пользователя
  /globalstats - Глобальная статистика
  /help - Показать эту справку
      `;
      bot.sendMessage(msg.chat.id, helpText);
    }
  };