// src/bot/user/commands/helpCommands.js

module.exports = {
  '/help': async (bot, msg) => {
    const helpTexts = [
      `
Доступные команды:

📞 **Управление телефонами:**
/add_phone [telegram|whatsapp|waba] [номер] - Добавить новый телефон. Например: /add_phone telegram +79123456789
/remove_phone [telegram|whatsapp|tgwa] [номер] - Удалить телефон. Например: /remove_phone telegram +79123456789
/list_phones - Показать список всех телефонов, привязанных к вашему аккаунту.
/phone_stats [номер] - Показать подробную статистику по телефону. Например: /phone_stats +79123456789

📝 **Информация о подписке:**
/check_subscription - Показать информацию о вашей подписке.
      `,
      `
📢 **Управление кампаниями рассылки:**
/create_mc [название] - Создать новую кампанию рассылки. Например: /create_mc МояКампания
/set_mc_message [название] - Установить сообщение для кампании. Например: /set_mc_message МояКампания
/toggle_mc [название] - Включить или выключить кампанию. Например: /toggle_mc МояКампания
/get_mc [название] - Получить информацию о кампании. Например: /get_mc МояКампания
/list_mc - Показать список всех ваших кампаний рассылки.
/mailing_test [номер] [telegram|whatsapp|waba|tgwa|tgwaba] - Отправить тестовое сообщение активной кампании на указанный номер. Например: /mailing_test +79123456789 telegram
/send_manual_mc [название_кампании] [номер] [telegram|whatsapp|tgwa] - Отправить сообщение кампании на указанный номер вручную. Например: /send_manual_mc МояКампания +79123456789 telegram
/set_platform_priority_mc [название] [telegram|whatsapp|tgwa] - Установить приоритет платформы для кампании. Например: /set_platform_priority_mc МояКампания telegram
/attach_phone_mc [название] [номер] [telegram|whatsapp|tgwa] - Прикрепить номер телефона к кампании. Например: /attach_phone_mc МояКампания +79123456789 telegram
/detach_phone_mc [название] [номер] - Открепить номер телефона от кампании. Например: /detach_phone_mc МояКампания +79123456789
/list_phones_mc [название] - Показать список номеров, прикрепленных к кампании. Например: /list_phones_mc МояКампания
/send_mc_to_leads [название] [статус лида] - Сделать рассылку по лидам, прикрепленным к кампании. Например: /send_mc_to_leads МояКампания NEW
/set_google_sheet [название] [googleSheetUrl] - Установить БД вопрос-ответ для кампании. Например: /set_google_sheet МояКампания https://docs.google.com/spreadsheets/d/123
/set_default_phone_mc [название] [номер] - Установить дефолтный номер для кампании. Например: /set_default_phone_mc МояКампания +79123456789
/get_default_phone_mc [название] - Получить дефолтный номер кампании. Например: /get_default_phone_mc МояКампания
/add_notification_id [название] [telegram_id] - Добавить Telegram ID для уведомлений кампании. Например: /add_notification_id МояКампания 123456789
/remove_notification_id [название] [telegram_id] - Удалить Telegram ID из уведомлений кампании. Например: /remove_notification_id МояКампания 123456789
/list_notification_ids [название] - Показать список Telegram ID для уведомлений кампании. Например: /list_notification_ids МояКампания
      `,
      `
📊 **Управление базами лидов:**
/create_leadsdb [название] - Создать новую базу лидов. Например: /create_leadsdb МояБазаЛидов
/list_leadsdb - Показать список всех ваших баз лидов.
/upload_leads_to_db [ID_базы] - Загрузить лиды в базу из Excel файла. Например: /upload_leads_to_db 123
/attach_leadsdb_to_campaign [ID_базы] [название_кампании] - Прикрепить базу лидов к кампании. Например: /attach_leadsdb_to_campaign 123 МояКампания
/detach_leadsdb_from_campaign [ID_базы] [название_кампании] - Открепить базу лидов от кампании. Например: /detach_leadsdb_from_campaign 123 МояКампания
/view_leads_in_db [ID_базы] - Просмотреть лиды в базе. Например: /view_leads_in_db 123
/update_lead_status [ID_лида] [NEW|UNAVAILABLE|PROCESSED_NEGATIVE|PROCESSED_POSITIVE] - Обновить статус лида. Например: /update_lead_status 456 PROCESSED_POSITIVE
/delete_lead [ID_лида] - Удалить лид. Например: /delete_lead 456
/view_leads [название_кампании] - Просмотреть все лиды, прикрепленные к кампании. Например: /view_leads МояКампания
/set_default_leadsdb [ID_базы] - Установить базу лидов как дефолтную для входящих лидов из CRM. Например: /set_default_leadsdb 123
/get_default_leadsdb - Показать текущую дефолтную базу лидов.
      `,
      `
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

🤖 **Настройки LLM для кампаний:**
/set_campaign_openai_key [название_кампании] [ключ_API] - Установить ключ API OpenAI для кампании. Например: /set_campaign_openai_key МояКампания sk-...
/set_campaign_model [название_кампании] [название_модели] - Установить модель для кампании. Например: /set_campaign_model МояКампания gpt-3.5-turbo
/get_campaign_model [название_кампании] - Получить текущую модель кампании. Например: /get_campaign_model МояКампания

📚 **Управление базами знаний:**
/create_kb [название] [имя_кампании] - Создать новую базу знаний. Например: /create_kb МояБазаЗнаний тест
/add_kb_document [название] - Добавить документ в базу знаний. Например: /add_kb_document МояБазаЗнаний
/list_kb - Показать список всех ваших баз знаний.
/delete_kb [название] - Удалить базу знаний. Например: /delete_kb МояБазаЗнаний

🌐 **Управление WABA аккаунтами:**
/add_waba_account [номер] [business_profile_id] - Добавить новый WABA аккаунт. Например: /add_waba_account +79123456789 123456789
/authenticate_waba [номер] - Аутентифицировать WABA аккаунт. Например: /authenticate_waba +79123456789
/send_waba_message [номер_отправителя] [номер_получателя] [сообщение] - Отправить WABA сообщение. Например: /send_waba_message +79123456789 +79987654321 Привет!

❓ **Прочее:**
/help - Показать эту справку.
      `,
    ];

    for (const text of helpTexts) {
      await bot.sendMessage(msg.chat.id, text);
    }
  },
};
