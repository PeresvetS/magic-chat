// src/bot/admin/index.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const { isAdmin } = require('../../middleware/adminCheck');
const subscriptionCommands = require('./commands/subscriptionCommands');
const userManagementCommands = require('./commands/userManagementCommands');
const phoneManagementCommands = require('./commands/phoneManagementCommands');
const limitCommands = require('./commands/limitCommands');
const statsCommands = require('./commands/statsCommands');
const helpCommands = require('./commands/helpCommands');



function createAdminBot() {
  const bot = new TelegramBot(config.ADMIN_BOT_TOKEN, { polling: false });

  const commandModules = [
    subscriptionCommands,
    userManagementCommands,
    phoneManagementCommands,
    limitCommands,
    statsCommands,
    helpCommands
  ];

  commandModules.forEach(module => {
    Object.entries(module).forEach(([command, handler]) => {
      bot.onText(new RegExp(command), async (msg, match) => {
        if (await isAdmin(msg.from.id)) {
          try {
            await handler(bot, msg, match);
          } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            bot.sendMessage(msg.chat.id, `Произошла ошибка при выполнении команды: ${error.message}`);
          }
        } else {
          bot.sendMessage(msg.chat.id, 'У вас нет прав для использования этой команды.');
        }
      });
    });
  });

  return bot;
}

module.exports = createAdminBot();