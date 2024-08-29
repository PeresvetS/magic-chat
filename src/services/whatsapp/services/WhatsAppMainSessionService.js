// src/services/whatsapp/src/WhatsAppMainSessionService.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('../../../utils/logger');
const config = require('../../../config');
const path = require('path');

class WhatsAppMainSessionService {
  constructor() {
    this.mainClient = null;
    this.tempDir = path.join(process.cwd(), 'temp');
    this.sessionDir = path.join(this.tempDir, '.wwebjs_auth');
  }

  cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  async initializeMainClient(qrCodeCallback) {
    if (this.mainClient && this.mainClient.isReady) {
      logger.info('Main WhatsApp client already initialized and ready');
      return this.mainClient;
    }

    const mainPhoneNumber = this.cleanPhoneNumber(config.MAIN_WA_PHONE_NUMBER);
    if (!mainPhoneNumber) {
      throw new Error('MAIN_WA_PHONE_NUMBER not set in configuration');
    }

    logger.info(`Initializing main WhatsApp client for ${mainPhoneNumber}`);

    this.mainClient = new Client({
      authStrategy: new LocalAuth({
        clientId: mainPhoneNumber,
        dataPath: this.sessionDir
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      }
    });

    return new Promise((resolve, reject) => {
      const initTimeout = setTimeout(() => {
        reject(new Error('WhatsApp client initialization timeout'));
      }, 60000); // 60 секунд таймаут

      this.mainClient.on('qr', async (qr) => {
        logger.info('WhatsApp QR code received for main client');
        try {
          const qrImageData = await qrcode.toDataURL(qr);
          if (qrCodeCallback) {
            await qrCodeCallback(qrImageData);
          }
        } catch (error) {
          logger.error('Error generating QR code:', error);
        }
      });

      this.mainClient.on('ready', () => {
        clearTimeout(initTimeout);
        logger.info(`Main WhatsApp client (${mainPhoneNumber}) is ready`);
        resolve(this.mainClient);
      });

      this.mainClient.on('auth_failure', (msg) => {
        clearTimeout(initTimeout);
        logger.error(`WhatsApp authentication failed for main client (${mainPhoneNumber})`, msg);
        reject(new Error('WhatsApp authentication failed'));
      });

      this.mainClient.initialize().catch(error => {
        clearTimeout(initTimeout);
        logger.error('Error during WhatsApp client initialization:', error);
        reject(error);
      });
    });
  }

  async getMainClient() {
    if (!this.mainClient || !this.mainClient.isReady) {
      await this.initializeMainClient();
    }
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
      await this.mainClient.destroy();
      this.mainClient = null;
    }
  }
}

module.exports = WhatsAppMainSessionService;