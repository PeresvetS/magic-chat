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
    logger.info('Initializing main Telegram client');
    logger.info(`API_ID: ${config.API_ID}, API_HASH: ${config.API_HASH}`);
    
    const sessionData = await telegramSessionsRepo.getSession(
      config.MAIN_TG_PHONE_NUMBER,
    );
    if (sessionData) {
      const stringSession = new StringSession(sessionData.session);
      this.mainClient = new TelegramClient(
        stringSession,
        parseInt(config.API_ID),
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
        parseInt(config.API_ID),
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
        new Api.contacts.ImportContacts({
          contacts: [
            new Api.InputPhoneContact({
              clientId: BigInt(Math.floor(Math.random() * 1000000000)),
              phone: phoneNumber,
              firstName: "Search",
              lastName: "User",
            }),
          ],
        })
      );

      return result.users && result.users.length > 0;
    } catch (error) {
      logger.error(`Error checking Telegram for number ${phoneNumber}:`, error);
      return false;
    }
  }

  async findUserByPhoneNumber(phoneNumber) {
    logger.info(`Searching for user with phone number: ${phoneNumber}`);
    try {
      const client = await this.getMainClient();
      
      const result = await client.invoke(
        new Api.contacts.ImportContacts({
          contacts: [
            new Api.InputPhoneContact({
              clientId: BigInt(Math.floor(Math.random() * 1000000000)),
              phone: phoneNumber,
              firstName: "Search",
              lastName: "User",
            }),
          ],
        })
      );

      if (result.users && result.users.length > 0) {
        const user = result.users[0];
        logger.info(`User found: ${user.id}`);
        
        // Получаем полную информацию о пользователе
        const fullUser = await client.invoke(new Api.users.GetFullUser({
          id: user.id
        }));
        
        return fullUser.user;
      } else {
        logger.info(`User not found for phone number: ${phoneNumber}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error searching for user with phone number ${phoneNumber}:`, error);
      throw error;
    }
  }
}

module.exports = new TelegramMainSessionService();
