# Документация проекта Magic Chat

## Обзор проекта

Magic Chat - это Node.js приложение для управления Telegram аккаунтами и отправки сообщений. Проект включает в себя функциональность для работы как с ботами Telegram, так и с личными аккаунтами пользователей. Основные возможности включают парсинг контактов в Telegram группах, управление телефонными номерами и рассылку сообщений.

## Структура проекта

```
magic-chat/
├── src/
│   ├── api/
│   │   ├── handlers/
│   │   │   └── messageHandler.js
│   │   ├── middleware/
│   │   │   └── checkApiKey.js
│   │   └── routes.js
│   ├── bot/
│   │   ├── admin/
│   │   │   ├── commands/
│   │   │   │   ├── helpCommands.js
│   │   │   │   ├── limitCommands.js
│   │   │   │   ├── phoneManagementCommands.js
│   │   │   │   ├── statsCommands.js
│   │   │   │   ├── subscriptionCommands.js
│   │   │   │   └── userManagementCommands.js
│   │   │   └── index.js
│   │   └── user/
│   │       ├── commands/
│   │       │   ├── accountCommands.js
│   │       │   ├── authCommands.js
│   │       │   ├── campaignCommands.js
│   │       │   ├── helpCommands.js
│   │       │   ├── parsingCommands.js
│   │       │   └── phoneCommands.js
│   │       └── index.js
│   ├── config/
│   │   └── index.js
│   ├── db/
│   │   ├── airtable/
│   │   │   ├── admins.js
│   │   │   ├── campaigns.js
│   │   │   ├── config.js
│   │   │   ├── parsedUsers.js
│   │   │   ├── phoneNumbers.js
│   │   │   └── utils.js
│   │   └── index.js
│   ├── messaging/
│   │   ├── messageProcessor.js
│   │   ├── messageSender.js
│   │   └── index.js
│   ├── middleware/
│   │   ├── adminCheck.js
│   │   └── subscriptionCheck.js
│   ├── services/
│   │   ├── auth/
│   │   │   └── authService.js
│   │   ├── campaign/
│   │   │   └── campaignService.js
│   │   ├── conversation/
│   │   │   └── conversationService.js
│   │   ├── parsing/
│   │   │   └── parsingService.js
│   │   ├── phone/
│   │   │   ├── phoneNumberService.js
│   │   │   ├── phoneService.js
│   │   │   ├── qrCodeService.js
│   │   │   └── telegramSessionService.js
│   │   ├── stats/
│   │   │   └── statsService.js
│   │   └── user/
│   │       ├── accountService.js
│   │       ├── limitService.js
│   │       ├── subscriptionService.js
│   │       └── userService.js
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── logger.js
│   │   └── userUtils.js
│   ├── index.js
│   └── main.js
├── .env
└── package.json
```

## Описание компонентов

### src/api/

Содержит компоненты для работы с API приложения.

- **handlers/messageHandler.js**: Обработчик сообщений API.
- **middleware/checkApiKey.js**: Middleware для проверки API ключа.
- **routes.js**: Определение маршрутов API.

### src/bot/

Содержит реализацию ботов Telegram.

#### admin/

Административный бот для управления системой.

- **commands/**: Команды административного бота.
  - **helpCommands.js**: Команды помощи.
  - **limitCommands.js**: Команды управления лимитами.
  - **phoneManagementCommands.js**: Команды управления телефонными номерами.
  - **statsCommands.js**: Команды для получения статистики.
  - **subscriptionCommands.js**: Команды управления подписками.
  - **userManagementCommands.js**: Команды управления пользователями.
- **index.js**: Основной файл административного бота.

#### user/

Пользовательский бот для взаимодействия с клиентами.

- **commands/**: Команды пользовательского бота.
  - **accountCommands.js**: Команды управления аккаунтом.
  - **authCommands.js**: Команды аутентификации.
  - **campaignCommands.js**: Команды управления кампаниями.
  - **helpCommands.js**: Команды помощи.
  - **parsingCommands.js**: Команды для парсинга.
  - **phoneCommands.js**: Команды управления телефонными номерами.
- **index.js**: Основной файл пользовательского бота.

### src/config/

- **index.js**: Конфигурационный файл проекта.

### src/db/

Компоненты для работы с базой данных.

- **airtable/**: Модули для работы с Airtable.
  - **admins.js**: Операции с таблицей администраторов.
  - **campaigns.js**: Операции с таблицей кампаний.
  - **config.js**: Конфигурация подключения к Airtable.
  - **parsedUsers.js**: Операции с таблицей спарсенных пользователей.
  - **phoneNumbers.js**: Операции с таблицей телефонных номеров.
  - **utils.js**: Вспомогательные функции для работы с Airtable.
- **index.js**: Основной файл для экспорта функций работы с БД.

### src/messaging/

Компоненты для обработки и отправки сообщений.

- **messageProcessor.js**: Обработка входящих сообщений.
- **messageSender.js**: Отправка сообщений.
- **index.js**: Основной файл модуля обмена сообщениями.

### src/middleware/

Middleware компоненты.

- **adminCheck.js**: Проверка прав администратора.
- **subscriptionCheck.js**: Проверка подписки пользователя.

### src/services/

Сервисы приложения.

#### auth/

- **authService.js**: Сервис аутентификации.

#### campaign/

- **campaignService.js**: Сервис управления кампаниями.

#### conversation/

- **conversationService.js**: Сервис управления диалогами.

#### parsing/

- **parsingService.js**: Сервис парсинга данных из Telegram.

#### phone/

- **phoneNumberService.js**: Сервис управления телефонными номерами.
- **phoneService.js**: Общий сервис для работы с телефонными номерами.
- **qrCodeService.js**: Сервис генерации QR-кодов для аутентификации.
- **telegramSessionService.js**: Сервис управления сессиями Telegram.

#### stats/

- **statsService.js**: Сервис сбора и обработки статистики.

#### user/

- **accountService.js**: Сервис управления аккаунтами пользователей.
- **limitService.js**: Сервис управления лимитами пользователей.
- **subscriptionService.js**: Сервис управления подписками пользователей.
- **userService.js**: Общий сервис для работы с пользователями.

### src/utils/

Утилиты и вспомогательные функции.

- **helpers.js**: Общие вспомогательные функции.
- **logger.js**: Модуль логирования.
- **userUtils.js**: Утилиты для работы с пользователями.

### src/index.js

Точка входа в приложение.

### src/main.js

Основной файл приложения, инициализирующий ключевые компоненты.

## Основные функциональные возможности

1. **Управление ботами**:
   - Административный бот для управления системой.
   - Пользовательский бот для взаимодействия с клиентами.

2. **Работа с личными аккаунтами Telegram**:
   - Добавление и аутентификация личных аккаунтов.
   - Отправка сообщений от имени личных аккаунтов.

3. **Парсинг данных**:
   - Сбор информации из Telegram групп и каналов.
   - Категоризация пользователей на основе их активности и профилей.

4. **Управление пользователями**:
   - Регистрация и аутентификация пользователей.
   - Управление подписками и лимитами.

5. **Управление телефонными номерами**:
   - Добавление и удаление номеров.
   - Отслеживание статуса и использования номеров.

6. **Проведение кампаний**:
   - Создание и управление кампаниями рассылки.
   - Отслеживание статистики кампаний.

7. **Аналитика и статистика**:
   - Сбор и анализ данных о пользователях и их активности.
   - Генерация отчетов по различным метрикам.

## Настройка и запуск

1. Установите зависимости: `npm install`
2. Настройте файл `.env` с необходимыми переменными окружения:
   - `API_ID` и `API_HASH`: Credentials для Telegram API
   - `USER_BOT_TOKEN` и `ADMIN_BOT_TOKEN`: Токены для ботов
   - `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`: Настройки для Airtable
   - `ALLOWED_ADMINS`: ID администраторов системы
3. Запустите приложение: `npm start`

## Заключение

Magic Chat представляет собой комплексное решение для управления Telegram аккаунтами, парсинга данных и проведения рассылок. Проект имеет модульную структуру, что облегчает его поддержку и расширение. При дальнейшей разработке рекомендуется уделить внимание улучшению механизмов обработки ошибок, оптимизации производительности при работе с большими объемами данных и расширению функциональности административного интерфейса.
