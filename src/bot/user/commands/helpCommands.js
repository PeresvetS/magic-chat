module.exports = {
  '/help': async (bot, msg) => {
    const helpText = `
Доступные команды:

📞 **Управление телефонами:**
/add_phone [номер] - Добавить новый телефон
/remove_phone [номер] - Удалить телефон
/list_phones - Показать список телефонов
/phone_stats [номер] - Показать статистику по телефону

📝 **Информация о подписке:**
/check_subscription - Показать информацию о подписке

📢 **Управление кампаниями рассылки:**
/create_mc [название] - Создать новую кампанию рассылки
/set_mc_message [название] - Установить сообщение для кампании
/toggle_mc [название] - Включить/выключить кампанию
/get_mc [название] - Проверить информацию о кампании
/list_mc - Показать список всех кампаний
/mailing_test [номер] [telegram|whatsapp|tgwa] - Отправить тестовое сообщение активной кампании
/send_manual_mc [название_кампании] [номер] [telegram|whatsapp|tgwa] - Отправить сообщение кампании на указанный номер
/set_platform_priority_mc [название] [telegram|whatsapp|tgwa] - Установить приоритет платформы для кампании
/attach_phone_mc [название] [номер] [telegram|whatsapp|tgwa] - Прикрепить номер телефона к кампании
/detach_phone_mc [название] [номер] - Открепить номер от кампании
/list_phones_mc [название] - Показать список номеров кампании

🔧 **Настройки CRM интеграций:**
/set_bitrix_webhook [WEBHOOK_ID] [INBOUND_URL] [OUTBOUND_TOKEN] - Установить Bitrix интеграцию
/set_amocrm_webhook [WEBHOOK_ID] [INBOUND_URL] [OUTBOUND_TOKEN] - Установить AmoCRM интеграцию
/get_crm_info - Получить информацию о текущих CRM интеграциях

❓ **Прочее:**
/help - Показать эту справку
    `;
    bot.sendMessage(msg.chat.id, helpText);
  }
};
