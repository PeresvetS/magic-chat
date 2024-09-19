// src/services/telegram/index.js

const sessionManager = require('./managers/sessionManager');
const botStateManager = require('./managers/botStateManager');
const authTelegramService = require('./services/authTelegramService');
const onlineStatusManager = require('./managers/onlineStatusManager');
const TelegramSessionService = require('./services/telegramSessionService');

module.exports = {
  sessionManager,
  botStateManager,
  onlineStatusManager,
  authTelegramService,
  TelegramSessionService,
};
