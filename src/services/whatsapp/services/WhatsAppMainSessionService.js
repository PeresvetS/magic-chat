// src/services/whatsapp/src/WhatsAppMainSessionService.js

const venom = require('venom-bot');
const qrcode = require('qrcode');
const logger = require('../../../utils/logger');
const config = require('../../../config');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppMainSessionService {
  constructor() {
    this.mainClient = null;
    this.authTimeout = 600000; // 10 минут
    this.sessionsPath = path.join(__dirname, '../../../../tokens/main');
  }

  cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  async checkExistingSession() {
    const mainPhoneNumber = this.cleanPhoneNumber(config.MAIN_WA_PHONE_NUMBER);
    const sessionPath = path.join(this.sessionsPath, `main-session-${mainPhoneNumber}`);
    try {
      await fs.access(sessionPath);
      // Проверяем наличие ключевых файлов сессии
      const files = await fs.readdir(sessionPath);
      return files.some(file => file.includes('session') || file.includes('tokens'));
    } catch (error) {
      return false;
    }
  }

  async initializeMainClient(qrCodeCallback) {

    const mainPhoneNumber = this.cleanPhoneNumber(config.MAIN_WA_PHONE_NUMBER);
    if (!mainPhoneNumber) {
      throw new Error('MAIN_WA_PHONE_NUMBER not set in configuration');
    }

    logger.info(`Initializing main WhatsApp client for ${mainPhoneNumber}`);

    const sessionExists = await this.checkExistingSession();
    const sessionName = `main-session-${mainPhoneNumber}`;

    return new Promise((resolve, reject) => {
      const initTimeout = setTimeout(() => {
        logger.error(`WhatsApp main client initialization timeout for ${mainPhoneNumber}`);
        reject(new Error('WhatsApp main client initialization timeout'));
      }, this.authTimeout);

      const venomOptions = {
        multidevice: true,
        headless: 'new',
        useChrome: true,
        debug: false,
        logQR: !sessionExists,
        browserArgs: ['--no-sandbox'],
        autoClose: 60000,
        createPathFileToken: true,
        disableWelcome: true,
        updatesLog: true,
        folderNameToken: this.sessionsPath,
      };

      if (sessionExists) {
        logger.info(`Using existing session for main WhatsApp client (${mainPhoneNumber})`);
        venomOptions.session = sessionName;
      } else {
        logger.info(`Creating new session for main WhatsApp client (${mainPhoneNumber})`);
      }

      venom
        .create(
          sessionName,
          async (base64Qr, asciiQR, attempts, urlCode) => {
            if (!sessionExists) {
              logger.info(`New QR code received for main WhatsApp client (${mainPhoneNumber}). Attempt: ${attempts}`);
              if (qrCodeCallback) {
                await qrCodeCallback(base64Qr);
              }
            }
          },
          (statusSession, session) => {
            logger.info(`Main WhatsApp client status for ${mainPhoneNumber}: ${statusSession}`);
            if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess' || statusSession === 'inChat') {
              clearTimeout(initTimeout);
              this.mainClient = session;
              resolve(session);
            }
          },
          venomOptions
        )
        .catch((error) => {
          clearTimeout(initTimeout);
          logger.error(`Error initializing main WhatsApp client (${mainPhoneNumber}):`, error);
          reject(error);
        });
    });
  }

  async getMainClient() {
    if (!this.mainClient || typeof this.mainClient.isConnected !== 'function') {
      logger.info('Main client not initialized or not connected. Initializing...');
      this.mainClient = await this.initializeMainClient();
    }
    logger.info(`Returning main WhatsApp client: ${typeof this.mainClient}`);
    return this.mainClient;
  }

  async authorizeMainClient(qrCodeCallback) {
    const mainPhoneNumber = this.cleanPhoneNumber(config.MAIN_WA_PHONE_NUMBER);
    if (!mainPhoneNumber) {
      throw new Error('MAIN_WA_PHONE_NUMBER not set in configuration');
    }

    if (this.mainClient) {
      await this.disconnectMainClient();
    }

    return this.initializeMainClient(qrCodeCallback);
  }

  async disconnectMainClient() {
    if (this.mainClient) {
      logger.info('Disconnecting main WhatsApp client');
      await this.mainClient.close();
      this.mainClient = null;
    }
  }
}

module.exports = new WhatsAppMainSessionService();