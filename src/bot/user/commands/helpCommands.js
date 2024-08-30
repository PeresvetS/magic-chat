// src/bot/user/commands/helpCommands.js

module.exports = {
  '/help': async (bot, msg) => {
    const helpText = `
Доступные команды:

📞 **Управление телефонами:**
/add_phone [telegram|whatsapp] [номер] - Добавить новый телефон. Например: /add_phone telegram +79123456789
/remove_phone [telegram|whatsapp|tgwa] [номер] - Удалить телефон. Например: /remove_phone telegram +79123456789
/list_phones - Показать список всех телефонов, привязанных к вашему аккаунту.
/phone_stats [номер] - Показать подробную статистику по телефону. Например: /phone_stats +79123456789

📝 **Информация о подписке:**
/check_subscription - Показать информацию о вашей подписке.

📢 **Управление кампаниями рассылки:**
/create_mc [название] - Создать новую кампанию рассылки. Например: /create_mc МояКампания
/set_mc_message [название] - Установить сообщение для кампании. Например: /set_mc_message МояКампания
/toggle_mc [название] - Включить или выключить кампанию. Например: /toggle_mc МояКампания
/get_mc [название] - Получить информацию о кампании. Например: /get_mc МояКампания
/list_mc - Показать список всех ваших кампаний рассылки.
/mailing_test [номер] [telegram|whatsapp|tgwa] - Отправить тестовое сообщение активной кампании на указанный номер. Например: /mailing_test +79123456789 telegram
/send_manual_mc [название_кампании] [номер] [telegram|whatsapp|tgwa] - Отправить сообщение кампании на указанный номер вручную. Например: /send_manual_mc МояКампания +79123456789 telegram
/set_platform_priority_mc [название] [telegram|whatsapp|tgwa] - Установить приоритет платформы для кампании. Например: /set_platform_priority_mc МояКампания telegram
/attach_phone_mc [название] [номер] [telegram|whatsapp|tgwa] - Прикрепить номер телефона к кампании. Например: /attach_phone_mc МояКампания +79123456789 telegram
/detach_phone_mc [название] [номер] - Открепить номер телефона от кампании. Например: /detach_phone_mc МояКампания +79123456789
/list_phones_mc [название] - Показать список номеров, прикрепленных к кампании. Например: /list_phones_mc МояКампания

🔧 **Настройки CRM интеграций:**
/set_bitrix_webhook [INBOUND_URL] - Установить входящий URL для интеграции с Bitrix. Например: /set_bitrix_webhook https://example.com/bitrix/webhook
/set_amocrm_webhook [INBOUND_URL] - Установить входящий URL для интеграции с AmoCRM. Например: /set_amocrm_webhook https://example.com/amocrm/webhook
/set_bitrix_token [OUTBOUND_TOKEN] - Установить исходящий токен API для Bitrix. Например: /set_bitrix_token your_bitrix_token
/set_amocrm_token [OUTBOUND_TOKEN] - Установить исходящий токен API для AmoCRM. Например: /set_amocrm_token your_amocrm_token
/get_crm_info - Получить информацию о текущих CRM интеграциях.

📝 **Управление промптами:**
/create_prompt [название] - Создать новый промпт. Например: /create_prompt МойПромпт
/set_prompt_content [название] - Установить содержимое для промпта. Например: /set_prompt_content МойПромпт
/get_prompt [название] - Получить информацию о промпте. Например: /get_prompt МойПромпт
/list_prompts - Показать список всех ваших промптов.
/set_campaign_prompt [название_кампании] [название_промпта] - Установить промпт для кампании. Например: /set_campaign_prompt МояКампания МойПромпт


❓ **Прочее:**
/help - Показать эту справку.
    `;
    bot.sendMessage(msg.chat.id, helpText);
  }
};
