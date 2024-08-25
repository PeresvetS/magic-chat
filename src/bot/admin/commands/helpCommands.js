module.exports = {
  '/help': async (bot, msg) => {
    const helpText = `
Доступные команды администратора:
/add_subscription [tg_id] [duration] [days|months] [repeat|once] - Добавить подписку
/check_subscription [user] - Информация о подписке
/update_subscription [user] [duration] [days|months] - Обновить подписку
/ban_user [user] - Забанить пользователя
/unban_user [user] - Разбанить пользователя
/user_info [user] - Информация о пользователе
/set_limit [user] [type] [value] - Установить лимит
/get_limits [user] - Получить лимиты пользователя
/global_stats - Глобальная статистика
/users_list - Получить список всех пользователей

Управление номерами телефонов:
/ban_phone [phone_number] [temporary|permanent] - Забанить номер телефона
/unban_phone [phone_number] - Разбанить номер телефона
/set_phone_limit [phone_number] [daily_limit] [total_limit] - Установить лимиты для номера телефона
/phone_details [phone_number] - Получить детальную информацию о номере телефона

/help - Показать эту справку
    `;
    bot.sendMessage(msg.chat.id, helpText);
  }
};
