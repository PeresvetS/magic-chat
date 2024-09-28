// src/bot/user/commands/phoneCommands.js

const {
  addPhoneNumber,
  removePhoneNumber,
  setPhoneNumberLimit,
  getPhoneNumberInfo,
  getUserPhoneNumbers,
} = require('../../../../services/phone/src/phoneNumberService');
const { getUserByTgId } = require('../../../../services/user/src/userService');
const { WABASessionService } = require('../../../../services/waba');
const { TelegramSessionService } = require('../../../../services/telegram');
const { WhatsAppSessionService } = require('../../../../services/whatsapp');
const logger = require('../../../../utils/logger');

module.exports = {
  '/add_phone (telegram|whatsapp|waba) ([+]?[0-9]+)': async (
    bot,
    msg,
    match,
  ) => {
    const [, platform, phoneNumber] = match;

    logger.info(
      `Extracted platform: ${platform}, phone number: ${phoneNumber}`,
    );

    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;

    logger.info(`Add phone command called by user ${userId}`);

    if (!phoneNumber) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите платформу и номер телефона после команды. Например: /add_phone telegram +79123456789',
      );
      return;
    }

    logger.info(
      `Attempting to add/update ${platform} number ${phoneNumber} for user ${userId}`,
    );

    try {
      const result = await addPhoneNumber(userId, phoneNumber, platform);
      logger.info(
        `Phone number ${phoneNumber} added/updated successfully for user ${userId}`,
      );

      if (platform === 'telegram') {
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: 'Ввести код',
                callback_data: `auth_code_${phoneNumber}_telegram`,
              },
            ],
            [
              {
                text: 'Сканировать QR-код',
                callback_data: `auth_qr_${phoneNumber}_telegram`,
              },
            ],
          ],
        };
        bot.sendMessage(
          msg.chat.id,
          `Номер ${phoneNumber} успешно ${result.isNew ? 'добавлен' : 'обновлен'}. Выберите способ Telegram аутентификации:`,
          {
            reply_markup: JSON.stringify(keyboard),
          },
        );
      } else if (platform === 'whatsapp') {
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: 'Сканировать QR-код',
                callback_data: `auth_qr_${phoneNumber}_whatsapp`,
              },
            ],
            [
              {
                text: 'Использовать номер телефона',
                callback_data: `auth_phone_${phoneNumber}_whatsapp`,
              },
            ],
          ],
        };
        bot.sendMessage(
          msg.chat.id,
          `Номер ${phoneNumber} успешно ${result.isNew ? 'добавлен' : 'обновлен'}. Выберите способ WhatsApp аутентификации:`,
          {
            reply_markup: JSON.stringify(keyboard),
          },
        );
      } else if (platform === 'waba') {
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: 'Аутентифицировать WABA',
                callback_data: `auth_waba_${phoneNumber}`,
              },
            ],
          ],
        };
        bot.sendMessage(
          msg.chat.id,
          `Номер ${phoneNumber} успешно ${result.isNew ? 'добавлен' : 'обновлен'}. Нажмите кнопку для аутентификации WABA:`,
          {
            reply_markup: JSON.stringify(keyboard),
          },
        );
      }
    } catch (error) {
      logger.error(
        `Error adding/updating ${platform} number ${phoneNumber} for user ${userId}:`,
        error,
      );
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при добавлении/обновлении номера: ${error.message}`,
      );
    }
  },

  '/remove_phone (telegram|whatsapp|waba|all) ([+]?[0-9]+)': async (
    bot,
    msg,
    match,
  ) => {
    const [, platform, phoneNumber] = match;

    logger.info(
      `Extracted platform: ${platform}, phone number: ${phoneNumber}`,
    );

    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Remove phone command called by user ${userId}`);

    if (!phoneNumber) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите платформу и номер телефона после команды. Например: /remove_phone telegram +79123456789',
      );
      return;
    }

    logger.info(
      `Attempting to remove ${platform} number ${phoneNumber} for user ${userId}`,
    );

    try {
      await removePhoneNumber(userId, phoneNumber, platform);
      logger.info(
        `${platform} number ${phoneNumber} removed successfully for user ${userId}`,
      );

      if (platform === 'telegram' || platform === 'all') {
        await TelegramSessionService.disconnectSession(phoneNumber);
      }
      if (platform === 'whatsapp' || platform === 'all') {
        await WhatsAppSessionService.disconnectSession(phoneNumber);
      }
      if (platform === 'waba' || platform === 'all') {
        await WABASessionService.disconnectSession(phoneNumber);
      }

      bot.sendMessage(
        msg.chat.id,
        `${platform} номер ${phoneNumber} успешно удален и сессия разорвана.`,
      );
    } catch (error) {
      logger.error(
        `Error removing ${platform} number ${phoneNumber} for user ${userId}:`,
        error,
      );
      let errorMessage = 'Произошла ошибка при удалении номера.';
      if (error.message.includes('не найден')) {
        errorMessage = `Номер ${phoneNumber} не найден или уже был удален.`;
      } else if (error.code === 'P2014') {
        errorMessage =
          'Не удалось удалить номер из-за связанных данных. Пожалуйста, обратитесь к администратору.';
      }
      bot.sendMessage(msg.chat.id, errorMessage);
    }
  },

  '/set_phone_limit (telegram|whatsapp) ([+]?[0-9]+) (\\d+) (\\d+)?': async (
    bot,
    msg,
    match,
  ) => {
    const [, platform, phoneNumber, dailyLimit, totalLimit] = match;

    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Set phone limit command called by user ${userId}`);

    if (!phoneNumber || !dailyLimit) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите платформу, номер телефона и дневной лимит. Например: /set_phone_limit telegram +79123456789 100',
      );
      return;
    }
    logger.info(
      `Attempting to set limits for ${platform} number ${phoneNumber}: daily=${dailyLimit}, total=${totalLimit || 'not set'}`,
    );
    try {
      await setPhoneNumberLimit(
        phoneNumber,
        platform,
        parseInt(dailyLimit),
        totalLimit ? parseInt(totalLimit) : null,
      );
      logger.info(
        `Limits set successfully for ${platform} number ${phoneNumber}`,
      );
      bot.sendMessage(
        msg.chat.id,
        `Лимиты для ${platform} номера ${phoneNumber} успешно установлены. Дневной лимит: ${dailyLimit}, Общий лимит: ${totalLimit || 'не установлен'}`,
      );
    } catch (error) {
      logger.error(
        `Error setting limits for ${platform} number ${phoneNumber}:`,
        error,
      );
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при установке лимитов: ${error.message}`,
      );
    }
  },

  '/list_phones': async (bot, msg) => {
    try {
      const user = await getUserByTgId(msg.from.id);
      if (!user) {
        bot.sendMessage(msg.chat.id, 'Пользователь не найден.');
        return;
      }
      const userId = user.id;
      logger.info(`List phones command called by user ${userId}`);

      const phoneNumbers = await getUserPhoneNumbers(userId);
      logger.info(
        `Retrieved ${phoneNumbers.length} phone numbers for user ${userId}`,
      );

      if (phoneNumbers.length === 0) {
        bot.sendMessage(
          msg.chat.id,
          'У вас нет добавленных номеров телефонов.',
        );
        return;
      }
      const phoneList = phoneNumbers
        .map(
          (phone) =>
            `${phone.phoneNumber} - Telegram: ${phone.isTelegramAuthenticated ? 'аутентифицирован' : 'не аутентифицирован'}, WhatsApp: ${phone.isWhatsappAuthenticated ? 'аутентифицирован' : 'не аутентифицирован'}, WABA: ${phone.isWABAAuthenticated ? 'аутентифицирован' : 'не аутентифицирован'}`,
        )
        .join('\n');
      bot.sendMessage(msg.chat.id, `Ваши номера телефонов:\n${phoneList}`);
    } catch (error) {
      logger.error('Error listing phone numbers:', error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при получении списка номеров: ${error.message}`,
      );
    }
  },

  '/phone_stats ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;

    logger.info(`Extracted phone number: ${phoneNumber}`);

    const user = await getUserByTgId(msg.from.id);
    const userId = user.id;
    logger.info(`Phone stats command called by user ${userId}`);

    if (!phoneNumber) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите номер телефона после команды. Например: /phone_stats +79123456789',
      );
      return;
    }
    logger.info(`Attempting to get info for phone number ${phoneNumber}`);
    try {
      const info = await getPhoneNumberInfo(phoneNumber);
      logger.info(`Retrieved info for phone number ${phoneNumber}`);
      let message = `Информация о номере ${phoneNumber}:\n`;
      message += `Telegram Premium: ${info.telegramAccount?.isPremium ? 'Да' : 'Нет'}\n`;
      message += `Забанен: ${info.isBanned ? 'Да' : 'Нет'}\n`;
      message += `Telegram аутентифицирован: ${info.telegramAccount?.isAuthenticated ? 'Да' : 'Нет'}\n`;
      message += `WhatsApp аутентифицирован: ${info.whatsappAccount?.isAuthenticated ? 'Да' : 'Нет'}\n`;
      message += `WABA аутентифицирован: ${info.WABAAccount?.isAuthenticated ? 'Да' : 'Нет'}\n`;
      message += `WhatsApp тип: ${info.whatsappAccount?.accountType || 'Не указан'}\n`;
      if (info.isBanned) {
        message += `Тип бана: ${info.banType}\n`;
      }
      message += `Отправлено сообщений в Telegram сегодня: ${info.telegramAccount?.messagesSentToday || 0}\n`;
      message += `Отправлено сообщений в WhatsApp сегодня: ${info.whatsappAccount?.messagesSentToday || 0}\n`;
      message += `Отправлено сообщений в WABA сегодня: ${info.WABAAccount?.messagesSentToday || 0}\n`;
      message += `Отправлено сообщений в Telegram всего: ${info.telegramAccount?.messagesSentTotal || 0}\n`;
      message += `Отправлено сообщений в WhatsApp всего: ${info.whatsappAccount?.messagesSentTotal || 0}\n`;
      message += `Отправлено сообщений в WABA всего: ${info.WABAAccount?.messagesSentTotal || 0}\n`;
      message += `Охвачено контактов в Telegram сегодня: ${info.telegramAccount?.contactsReachedToday || 0}\n`;
      message += `Охвачено контактов в WhatsApp сегодня: ${info.whatsappAccount?.contactsReachedToday || 0}\n`;
      message += `Охвачено контактов в WABA сегодня: ${info.WABAAccount?.contactsReachedToday || 0}\n`;
      message += `Охвачено контактов в Telegram всего: ${info.telegramAccount?.contactsReachedTotal || 0}\n`;
      message += `Охвачено контактов в WhatsApp всего: ${info.whatsappAccount?.contactsReachedTotal || 0}\n`;
      message += `Охвачено контактов в WABA всего: ${info.WABAAccount?.contactsReachedTotal || 0}\n`;
      message += `Дневной лимит Telegram: ${info.telegramAccount?.dailyLimit || 'Не установлен'}\n`;
      message += `Дневной лимит WhatsApp: ${info.whatsappAccount?.dailyLimit || 'Не установлен'}\n`;
      message += `Дневной лимит WABA: ${info.WABAAccount?.dailyLimit || 'Не установлен'}\n`;
      message += `Общий лимит Telegram: ${info.telegramAccount?.totalLimit || 'Не установлен'}\n`;
      message += `Общий лимит WhatsApp: ${info.whatsappAccount?.totalLimit || 'Не установлен'}\n`;
      message += `Общий лимит WABA: ${info.WABAAccount?.totalLimit || 'Не установлен'}\n`;
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      logger.error(
        `Error getting info for phone number ${phoneNumber}:`,
        error,
      );
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при получении информации о номере: ${error.message}`,
      );
    }
  },
};
