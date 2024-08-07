# База данных Airtable - Схема таблиц

## Таблица: PhoneNumbers

Хранит информацию о номерах телефонов, используемых для рассылки.

| Поле | Тип | Описание |
|------|-----|----------|
| phone_number | Text | Номер телефона |
| user_id | Number | ID пользователя, которому принадлежит номер |
| is_banned | Checkbox | Забанен ли номер |
| ban_type | Single Select | Тип бана (temporary, permanent) |
| is_premium | Checkbox | Имеет ли номер премиум статус |
| messages_sent_today | Number | Количество отправленных сообщений за сегодня |
| messages_sent_total | Number | Общее количество отправленных сообщений |
| contacts_reached_today | Number | Количество охваченных контактов за сегодня |
| contacts_reached_total | Number | Общее количество охваченных контактов |
| daily_limit | Number | Ежедневный лимит на количество контактов |
| total_limit | Number | Общий лимит на количество контактов |
| created_at | Date | Дата добавления номера |
| updated_at | Date | Дата последнего обновления |

## Таблица: ParsedUsers

Хранит информацию о спарсенных пользователях.

| Поле | Тип | Описание |
|------|-----|----------|
| campaign_id | Number | ID кампании парсинга |
| group_username | Text | Username группы Telegram |
| group_link | Text | Ссылка на группу Telegram |
| user_id | Number | ID пользователя в Telegram |
| username | Text | Username пользователя |
| first_name | Text | Имя пользователя |
| last_name | Text | Фамилия пользователя |
| bio | Long text | Описание профиля пользователя |
| category | Single select | Категория пользователя (best, good, normal, mediocre) |
| parsed_at | Date | Дата и время парсинга |
| last_seen | Date | Дата последнего входа пользователя |
| has_channel | Checkbox | Есть ли у пользователя свой канал |
| is_processed | Checkbox | Обработан ли контакт |
| processing_status | Single select | Статус обработки (lead, rejected, empty) |

## Таблица: Admins

Хранит информацию об администраторах системы.

| Поле | Тип | Описание |
|------|-----|----------|
| admin_id | Number | ID администратора в Telegram |
| username | Text | Username администратора |
| added_at | Date | Дата и время добавления администратора |

## Таблица: ParsingCampaigns

Хранит информацию о кампаниях парсинга.

| Поле | Тип | Описание |
|------|-----|----------|
| name | Text | Название кампании |
| groups | Text | Список групп для парсинга (разделенных запятыми) |
| audience_description | Long text | Описание целевой аудитории |
| created_at | Date | Дата и время создания кампании |
| status | Single select | Статус кампании (pending, in_progress, completed, failed) |
| max_users | Number | Максимальное количество пользователей для парсинга |
| depth | Number | Глубина сохранения (1-4) |
| total_parsed | Number | Общее количество спарсенных пользователей |
| processed_count | Number | Количество обработанных контактов |
| is_fully_processed | Checkbox | Полностью ли обработана кампания |

## Таблица: Subscriptions

Хранит информацию о подписках пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | Number | ID пользователя в Telegram |
| start_date | Date | Дата начала подписки |
| end_date | Date | Дата окончания подписки |
| is_repeating | Checkbox | Является ли подписка повторяемой |
| duration_days | Number | Длительность подписки в днях |

## Таблица: UserLimits

Хранит информацию о лимитах пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | Number | ID пользователя в Telegram |
| parsing_limit | Number | Лимит на количество парсинга людей |
| phones_limit | Number | Лимит на количество подключенных номеров |
| campaigns_limit | Number | Лимит на количество кампаний |
| contacts_limit | Number | Лимит на количество обработанных контактов |
| leads_limit | Number | Лимит на количество успешных лидов |

## Таблица: Users

Хранит информацию о пользователях системы.

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | Number | ID пользователя в Telegram |
| username | Text | Username пользователя в Telegram |
| is_banned | Checkbox | Забанен ли пользователь |
| registered_at | Date | Дата регистрации пользователя |


