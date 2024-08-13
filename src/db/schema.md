# База данных PostgreSQL - Схема таблиц

## Таблица: users

Хранит информацию о пользователях системы.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор пользователя (PRIMARY KEY) |
| telegram_id | BIGINT | ID пользователя в Telegram (UNIQUE, NOT NULL) |
| username | VARCHAR(255) | Username пользователя (UNIQUE) |
| first_name | VARCHAR(255) | Имя пользователя |
| last_name | VARCHAR(255) | Фамилия пользователя |
| is_banned | BOOLEAN | Забанен ли пользователь (DEFAULT FALSE) |
| registered_at | TIMESTAMP | Дата и время регистрации пользователя (DEFAULT CURRENT_TIMESTAMP) |

## Таблица: admins

Хранит информацию об администраторах системы.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор записи (PRIMARY KEY) |
| user_id | INTEGER | ID пользователя-администратора (REFERENCES users(id)) |
| added_at | TIMESTAMP | Дата и время добавления администратора (DEFAULT CURRENT_TIMESTAMP) |

## Таблица: subscriptions

Хранит информацию о подписках пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор подписки (PRIMARY KEY) |
| user_id | INTEGER | ID пользователя (REFERENCES users(id)) |
| start_date | TIMESTAMP | Дата начала подписки (NOT NULL) |
| end_date | TIMESTAMP | Дата окончания подписки (NOT NULL) |
| is_repeating | BOOLEAN | Является ли подписка повторяемой (DEFAULT FALSE) |
| duration_days | INTEGER | Длительность подписки в днях |

## Таблица: user_limits

Хранит информацию о лимитах пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор записи (PRIMARY KEY) |
| user_id | INTEGER | ID пользователя (REFERENCES users(id)) |
| parsing_limit | INTEGER | Лимит на количество парсинга людей |
| phones_limit | INTEGER | Лимит на количество подключенных номеров |
| campaigns_limit | INTEGER | Лимит на количество кампаний |
| contacts_limit | INTEGER | Лимит на количество обработанных контактов |
| leads_limit | INTEGER | Лимит на количество успешных лидов |

## Таблица: phone_numbers

Хранит информацию о номерах телефонов, используемых для рассылки.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор записи (PRIMARY KEY) |
| phone_number | VARCHAR(20) | Номер телефона (UNIQUE, NOT NULL) |
| user_id | INTEGER | ID пользователя (REFERENCES users(id)) |
| is_banned | BOOLEAN | Забанен ли номер (DEFAULT FALSE) |
| ban_type | VARCHAR(20) | Тип бана |
| is_premium | BOOLEAN | Имеет ли номер премиум статус (DEFAULT FALSE) |
| is_authenticated | BOOLEAN | Прошел ли номер аутентификацию (DEFAULT FALSE) |
| messages_sent_today | INTEGER | Количество отправленных сообщений за сегодня (DEFAULT 0) |
| messages_sent_total | INTEGER | Общее количество отправленных сообщений (DEFAULT 0) |
| contacts_reached_today | INTEGER | Количество охваченных контактов за сегодня (DEFAULT 0) |
| contacts_reached_total | INTEGER | Общее количество охваченных контактов (DEFAULT 0) |
| daily_limit | INTEGER | Ежедневный лимит на количество контактов (DEFAULT 40) |
| total_limit | INTEGER | Общий лимит на количество контактов |
| max_inactivity_time | INTEGER | Максимальное время неактивности в секундах (DEFAULT 3600) |
| created_at | TIMESTAMP | Дата и время добавления номера (DEFAULT CURRENT_TIMESTAMP) |
| updated_at | TIMESTAMP | Дата и время последнего обновления (DEFAULT CURRENT_TIMESTAMP) |

## Таблица: parsing_campaigns

Хранит информацию о кампаниях парсинга.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор кампании (PRIMARY KEY) |
| user_id | INTEGER | ID пользователя (REFERENCES users(id)) |
| name | VARCHAR(255) | Название кампании (NOT NULL) |
| groups | TEXT | Список групп для парсинга |
| audience_description | TEXT | Описание целевой аудитории |
| status | VARCHAR(50) | Статус кампании |
| max_users | INTEGER | Максимальное количество пользователей для парсинга |
| depth | INTEGER | Глубина сохранения |
| total_parsed | INTEGER | Общее количество спарсенных пользователей (DEFAULT 0) |
| processed_count | INTEGER | Количество обработанных контактов (DEFAULT 0) |
| is_fully_processed | BOOLEAN | Полностью ли обработана кампания (DEFAULT FALSE) |
| last_parsed_at | TIMESTAMP | Дата и время последнего парсинга |
| created_at | TIMESTAMP | Дата и время создания кампании (DEFAULT CURRENT_TIMESTAMP) |
| updated_at | TIMESTAMP | Дата и время последнего обновления (DEFAULT CURRENT_TIMESTAMP) |

## Таблица: parsed_users

Хранит информацию о спарсенных пользователях.

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL | Уникальный идентификатор записи (PRIMARY KEY) |
| campaign_id | INTEGER | ID кампании парсинга (REFERENCES parsing_campaigns(id)) |
| group_username | VARCHAR(255) | Username группы Telegram |
| group_link | VARCHAR(255) | Ссылка на группу Telegram |
| user_id | BIGINT | ID пользователя в Telegram (NOT NULL) |
| username | VARCHAR(255) | Username пользователя |
| first_name | VARCHAR(255) | Имя пользователя |
| last_name | VARCHAR(255) | Фамилия пользователя |
| bio | TEXT | Описание профиля пользователя |
| category | VARCHAR(100) | Категория пользователя |
| parsed_at | TIMESTAMP | Дата и время парсинга (DEFAULT CURRENT_TIMESTAMP) |
| last_seen | TIMESTAMP | Дата последнего входа пользователя |
| has_channel | BOOLEAN | Есть ли у пользователя свой канал (DEFAULT FALSE) |
| is_processed | BOOLEAN | Обработан ли контакт (DEFAULT FALSE) |
| processing_status | VARCHAR(50) | Статус обработки |