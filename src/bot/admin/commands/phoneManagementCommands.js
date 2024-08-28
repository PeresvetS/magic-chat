// src/bot/admin/commands/phoneManagementCommands.js

const { updatePhoneNumberStatus, setPhoneNumberLimit, getPhoneNumberInfo } = require('../../../services/phone').phoneNumberService;
const { TelegramSessionService } = require('../../../services/telegram');
const { WhatsAppMainSessionService } = require('../../../services/whatsapp');
const config = require('../../../config');

module.exports = {
  '/ban_phone ([+]?[0-9]+) (temporary|permanent)': async (bot, msg, match) => {
    const [, phoneNumber, banType] = match;
    try {
      await updatePhoneNumberStatus(phoneNumber, true, banType);
      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} забанен (тип: ${banType}).`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при бане номера: ${error.message}`);
    }
  },

  '/unban_phone ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      await updatePhoneNumberStatus(phoneNumber, false);
      bot.sendMessage(msg.chat.id, `Бан для номера ${phoneNumber} снят.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при снятии бана: ${error.message}`);
    }
  },

  '/set_phone_limit ([+]?[0-9]+) (\\d+) (\\d+)?': async (bot, msg, match) => {
    const [, phoneNumber, platform, dailyLimit, totalLimit] = match;
    try {
      await setPhoneNumberLimit(phoneNumber, platform, parseInt(dailyLimit), totalLimit ? parseInt(totalLimit) : null);
      bot.sendMessage(msg.chat.id, `Установлены лимиты для номера ${phoneNumber}: ежедневный - ${dailyLimit}, общий - ${totalLimit || 'не установлен'}.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при установке лимитов: ${error.message}`);
    }
  },

  '/phone_details ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      const info = await getPhoneNumberInfo(phoneNumber);
      let message = `Детальная информация о номере ${phoneNumber}:\n`;
      message += `Пользователь: ${info.id}\n`;
      message += `Премиум: ${info.isTelegramPremium ? 'Да' : 'Нет'}\n`;
      message += `Забанен: ${info.isBanned ? 'Да' : 'Нет'}\n`;
      message += `Аутентифицирован: ${info.isTelegramAuthenticated ? 'Да' : 'Нет'}\n`;
      if (info.is_banned) {
        message += `Тип бана: ${info.banType}\n`;
      }
      message += `Отправлено сообщений в Telegram сегодня: ${info.telegramMessagesSentToday}\n`;
      message += `Отправлено сообщений в WhatsApp сегодня: ${info.whatsappMessagesSentToday}\n`;
      message += `Отправлено сообщений в Telegram всего: ${info.telegramMessagesSentTotal}\n`;
      message += `Отправлено сообщений в WhatsApp всего: ${info.whatsappMessagesSentTotal}\n`;
      message += `Охвачено контактов сегодня: ${info.contactsReachedToday}\n`;
      message += `Охвачено контактов всего: ${info.contactsReachedTotal}\n`;
      message += `Дневной лимит: ${info.dailyLimit}\n`;
      message += `Общий лимит: ${info.totalLimit || 'Не установлен'}\n`;
      message += `Добавлен: ${info.createdAt}\n`;
      message += `Последнее обновление: ${info.updatedAt}`;
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о номере: ${error.message}`);
    }
  },

  '/authorize_tg_main_phone': async (bot, msg) => {
    try {
      const mainPhoneNumber = config.MAIN_TG_PHONE_NUMBER;
      if (!mainPhoneNumber) {
        throw new Error('MAIN_TG_PHONE_NUMBER not set in configuration');
      }

      bot.sendMessage(msg.chat.id, `Начинаем процесс авторизации для номера ${mainPhoneNumber}. Следуйте инструкциям.`);

      await TelegramSessionService.authorizeMainClient(
        async () => {
          await bot.sendMessage(msg.chat.id, 'Введите код авторизации, полученный в Telegram:');
          return new Promise((resolve) => {
            bot.once('message', (codeMsg) => {
              resolve(codeMsg.text.trim());
            });
          });
        },
        async () => {
          await bot.sendMessage(msg.chat.id, 'Введите пароль 2FA (если требуется):');
          return new Promise((resolve) => {
            bot.once('message', (passwordMsg) => {
              resolve(passwordMsg.text.trim());
            });
          });
        }
      );

      bot.sendMessage(msg.chat.id, `Основной номер ${mainPhoneNumber} успешно авторизован.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при авторизации основного номера: ${error.message}`);
    }
  },

  '/authorize_wa_main_phone': async (bot, msg) => {
    try {
      const mainPhoneNumber = config.MAIN_WA_PHONE_NUMBER;
      if (!mainPhoneNumber) {
        throw new Error('MAIN_WA_PHONE_NUMBER not set in configuration');
      }

      bot.sendMessage(msg.chat.id, `Начинаем процесс авторизации WhatsApp для номера ${mainPhoneNumber}. Следуйте инструкциям.`);

      await WhatsAppMainSessionService.authorizeMainClient(
        async (qrImageData) => {
          await bot.sendPhoto(msg.chat.id, Buffer.from(qrImageData.split(',')[1], 'base64'), {
            caption: 'Отсканируйте этот QR-код в приложении WhatsApp для авторизации основного номера.'
          });
        }
      );

      bot.sendMessage(msg.chat.id, `Основной номер ${mainPhoneNumber} успешно авторизован в WhatsApp.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при авторизации основного номера WhatsApp: ${error.message}`);
    }
  },
};