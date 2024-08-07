// src/bot/user/index.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const { checkSubscription } = require('../../middleware/subscriptionCheck');
const phoneCommands = require('./commands/phoneCommands');
const parsingCommands = require('./commands/parsingCommands');
const campaignCommands = require('./commands/campaignCommands');
const accountCommands = require('./commands/accountCommands');
const helpCommands = require('./commands/helpCommands');
const telegramSessionService = require('../../services/phone/telegramSessionService');

function createUserBot() {
  const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: false });

  const commandModules = [
    phoneCommands,
    parsingCommands,
    campaignCommands,
    accountCommands,
    helpCommands
  ];

  commandModules.forEach(module => {
    Object.entries(module).forEach(([command, handler]) => {
      bot.onText(new RegExp(command), async (msg, match) => {
        if (await checkSubscription(msg.from.id)) {
          try {
            await handler(bot, msg, match);
          } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            bot.sendMessage(msg.chat.id, `Произошла ошибка при выполнении команды: ${error.message}`);
          }
        } else {
          bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для продления.');
        }
      });
    });
  });

  // Добавляем обработчик callback query
  bot.on('callback_query', async (query) => {
    const [action, authType, phoneNumber] = query.data.split('_');
    if (action === 'auth') {
      if (authType === 'code') {
        try {
          await telegramSessionService.authenticateSession(phoneNumber, bot, query.message.chat.id);
          bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован.`);
        } catch (error) {
          bot.sendMessage(query.message.chat.id, `Ошибка при аутентификации номера: ${error.message}`);
        }
      } else if (authType === 'qr') {
        try {
          await telegramSessionService.generateQRCode(phoneNumber, bot, query.message.chat.id);
          bot.sendMessage(query.message.chat.id, `QR-код для аутентификации номера ${phoneNumber} отправлен.`);
        } catch (error) {
          bot.sendMessage(query.message.chat.id, `Ошибка при генерации QR-кода: ${error.message}`);
        }
      }
    }
  });

  return bot;
}

module.exports = createUserBot();