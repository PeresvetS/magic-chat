// src/services/messaging/src/BotStateManagerFactory.js

const TelegramBotStateManager = require('../../telegram/managers/botStateManager');
const WhatsAppBotStateManager = require('../../whatsapp/managers/botStateManager');
const WABABotStateManager = require('../../waba/managers/botStateManager');

class BotStateManagerFactory {
  constructor() {
    this.managers = {
      telegram: new TelegramBotStateManager(),
      whatsapp: new WhatsAppBotStateManager(),
      waba: new WABABotStateManager(),
    };
  }

  getManager(platform) {
    const manager = this.managers[platform];
    if (!manager) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return manager;
  }
}

module.exports = new BotStateManagerFactory();