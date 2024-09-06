// src/bot/user/commands/wabaCommands.js

const logger = require('../../../utils/logger');
const WABAAccountService = require('../../../services/waba/services/WABAAccountService');
const WABASessionService = require('../../../services/waba/services/WABASessionService');

module.exports = {
  '/add_waba_account ([+]?[0-9]+) (.+)': async (bot, msg, match) => {
    const [, phoneNumber, businessProfileId] = match;
    try {
      await WABAAccountService.createAccount(phoneNumber, businessProfileId);
      bot.sendMessage(
        msg.chat.id,
        `WABA аккаунт для номера ${phoneNumber} успешно добавлен.`,
      );
    } catch (error) {
      logger.error(`Error adding WABA account for ${phoneNumber}:`, error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при добавлении WABA аккаунта: ${error.message}`,
      );
    }
  },

  '/authenticate_waba ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      await WABAAccountService.setAuthenticated(phoneNumber, true);
      const session = await WABASessionService.createOrGetSession(phoneNumber);
      if (session) {
        bot.sendMessage(
          msg.chat.id,
          `WABA аккаунт для номера ${phoneNumber} успешно аутентифицирован.`,
        );
      } else {
        bot.sendMessage(
          msg.chat.id,
          `Не удалось аутентифицировать WABA аккаунт для номера ${phoneNumber}.`,
        );
      }
    } catch (error) {
      logger.error(
        `Error authenticating WABA account for ${phoneNumber}:`,
        error,
      );
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при аутентификации WABA аккаунта: ${error.message}`,
      );
    }
  },

  '/waba_account_info ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      const account = await WABAAccountService.getAccount(phoneNumber);
      if (account) {
        const info = `
WABA Account Info:
Phone Number: ${account.phoneNumber}
Business Profile ID: ${account.businessProfileId}
Authenticated: ${account.isAuthenticated ? 'Yes' : 'No'}
Messages Sent Today: ${account.messagesSentToday}
Total Messages Sent: ${account.messagesSentTotal}
Contacts Reached Today: ${account.contactsReachedToday}
Total Contacts Reached: ${account.contactsReachedTotal}
        `;
        bot.sendMessage(msg.chat.id, info);
      } else {
        bot.sendMessage(
          msg.chat.id,
          `WABA аккаунт для номера ${phoneNumber} не найден.`,
        );
      }
    } catch (error) {
      logger.error(
        `Error getting WABA account info for ${phoneNumber}:`,
        error,
      );
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при получении информации о WABA аккаунте: ${error.message}`,
      );
    }
  },

  '/delete_waba_account ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, phoneNumber] = match;
    try {
      await WABAAccountService.deleteAccount(phoneNumber);
      bot.sendMessage(
        msg.chat.id,
        `WABA аккаунт для номера ${phoneNumber} успешно удален.`,
      );
    } catch (error) {
      logger.error(`Error deleting WABA account for ${phoneNumber}:`, error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при удалении WABA аккаунта: ${error.message}`,
      );
    }
  },

  '/send_waba_message ([+]?[0-9]+) ([+]?[0-9]+) (.+)': async (
    bot,
    msg,
    match,
  ) => {
    const [, senderPhoneNumber, recipientPhoneNumber, message] = match;
    try {
      await WABASessionService.sendMessage(
        senderPhoneNumber,
        recipientPhoneNumber,
        message,
      );
      bot.sendMessage(
        msg.chat.id,
        `Сообщение успешно отправлено с номера ${senderPhoneNumber} на номер ${recipientPhoneNumber}.`,
      );
    } catch (error) {
      logger.error(
        `Error sending WABA message from ${senderPhoneNumber} to ${recipientPhoneNumber}:`,
        error,
      );
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при отправке WABA сообщения: ${error.message}`,
      );
    }
  },
};
