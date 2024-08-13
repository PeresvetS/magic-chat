// src/bot/admin/commands/helpCommands.js

module.exports = {
  '/help': async (bot, msg) => {
    const helpText = `
Доступные команды администратора:
/addsubscription [tg_id] [duration] [days|months] [repeat|once] - Добавить подписку
/checksubscription [user] - Информация о подписке
/updatesubscription [user] [duration] [days|months] - Обновить подписку
/banuser [user] - Забанить пользователя
/unbanuser [user] - Разбанить пользователя
/userinfo [user] - Информация о пользователе
/setlimit [user] [type] [value] - Установить лимит
/getlimits [user] - Получить лимиты пользователя
/globalstats - Глобальная статистика
/userslist - Получить список всех пользователей
/help - Показать эту справку
    `;
    bot.sendMessage(msg.chat.id, helpText);
  }
};