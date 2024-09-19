// src/services/telegram/services/mainClientService.js

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');

const config = require('../../../config');
const logger = require('../../../utils/logger');
const { telegramSessionsRepo } = require('../../../db');
const { checkAuthorization } = require('./authTelegramService');

class TelegramMainSessionService {
  constructor() {
    this.mainClient = null;
  }

  async getMainClient() {
    if (!this.mainClient) {
      await this.initializeMainClient();
    }
    return this.mainClient;
  }

  async initializeMainClient() {
    const sessionData = await telegramSessionsRepo.getSession(
      config.MAIN_TG_PHONE_NUMBER,
    );
    if (sessionData) {
      const stringSession = new StringSession(sessionData.session);
      this.mainClient = new TelegramClient(
        stringSession,
        config.API_ID,
        config.API_HASH,
        {
          connectionRetries: 5,
        },
      );
      await this.mainClient.connect();
      if (await checkAuthorization(this.mainClient)) {
        logger.info('Main Telegram client connected and authorized');
      } else {
        logger.warn(
          'Main Telegram client connected but not authorized. Use /authorize_main_phone command to authorize.',
        );
      }
    } else {
      logger.warn(
        'No session found for main phone number. Use /authorize_main_phone command to authorize.',
      );
    }
  }

  async authorizeMainClient(getAuthCode, get2FAPassword) {
    if (!this.mainClient) {
      this.mainClient = new TelegramClient(
        new StringSession(''),
        config.API_ID,
        config.API_HASH,
        {
          connectionRetries: 5,
        },
      );
    }

    await this.mainClient.start({
      phoneNumber: async () => config.MAIN_TG_PHONE_NUMBER,
      password: get2FAPassword,
      phoneCode: getAuthCode,
      onError: (err) => {
        logger.error('Error during main client authorization:', err);
        throw err;
      },
    });

    logger.info('Main Telegram client successfully authorized');
    const sessionString = this.mainClient.session.save();
    await telegramSessionsRepo.saveSession(
      config.MAIN_TG_PHONE_NUMBER,
      sessionString,
    );
  }

  async checkTelegram(phoneNumber) {
    logger.info(`Checking Telegram for number ${phoneNumber}`);
    try {
      const client = await this.getMainClient();
      const result = await client.invoke(
        new Api.contacts.ResolvePhone({
          phone: phoneNumber,
        }),
      );

      return result.users && result.users.length > 0;
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumber}:`, error);
      return false;
    }
  }
}

module.exports = new TelegramMainSessionService();
