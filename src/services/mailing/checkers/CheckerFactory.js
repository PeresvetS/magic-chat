// src/services/mailing/checkers/CheckerFactory.js

const TelegramChecker = require('./TelegramChecker');
const WhatsAppChecker = require('./WhatsAppChecker');
const WABAChecker = require('./WABAChecker');

class CheckerFactory {
  constructor() {
    this.checkers = new Map();
  }

  getChecker(platform) {
    if (!this.checkers.has(platform)) {
      switch (platform) {
        case 'telegram':
          this.checkers.set(platform, new TelegramChecker());
          break;
        case 'whatsapp':
          this.checkers.set(platform, new WhatsAppChecker());
          break;
        case 'waba':
          this.checkers.set(platform, new WABAChecker());
          break;
        case 'tgwa':
            this.checkers.set(platform, new TelegramChecker());
            this.checkers.set(platform, new WhatsAppChecker());
            break;
        case 'tgwaba':
            this.checkers.set(platform, new TelegramChecker());
            this.checkers.set(platform, new WABAChecker());
            break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    }
    return this.checkers.get(platform);
  }
}

module.exports = new CheckerFactory();