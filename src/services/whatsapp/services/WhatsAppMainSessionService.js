// src/services/whatsapp/src/WhatsAppMainSessionService.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('../../../utils/logger');
const config = require('../../../config');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppMainSessionService {
  constructor() {
    this.mainClient = null;
    this.tempDir = path.join(process.cwd(), 'temp');
    this.sessionDir = path.join(this.tempDir, '.wwebjs_auth');
    this.authTimeout = 600000; // 10 минут
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
        headless: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        timeout: 60000 
      }
    });

    return new Promise((resolve, reject) => {
      const initTimeout = setTimeout(() => {
        logger.error(`WhatsApp main client initialization timeout for ${mainPhoneNumber}`);
        reject(new Error('WhatsApp main client initialization timeout'));
      }, this.authTimeout);

      this.mainClient.on('qr', async (qr) => {
        logger.info(`New QR code received for main WhatsApp client (${mainPhoneNumber})`);
        try {
          const qrImageData = await qrcode.toDataURL(qr);
          if (qrCodeCallback) {
            await qrCodeCallback(qrImageData);
          }
        } catch (error) {
          logger.error('Error generating QR code:', error);
        }
      });

      this.mainClient.on('ready', async () => {
        clearTimeout(initTimeout);
        logger.info(`Main WhatsApp client (${mainPhoneNumber}) is ready`);
        this.mainClient.isReady = true;
        await this.saveMainSession(mainPhoneNumber);
        resolve(this.mainClient);
      });

      this.mainClient.on('error', (error) => {
        logger.error(`Main WhatsApp client error for ${mainPhoneNumber}:`, error);
      });

      this.mainClient.on('authenticated', () => {
        logger.info(`Main WhatsApp client (${mainPhoneNumber}) authenticated`);
      });

      this.mainClient.on('auth_failure', (msg) => {
        clearTimeout(initTimeout);
        logger.error(`WhatsApp authentication failed for main client (${mainPhoneNumber}):`, msg);
        reject(new Error('WhatsApp authentication failed'));
      });

      this.mainClient.on('disconnected', (reason) => {
        logger.warn(`Main WhatsApp client (${mainPhoneNumber}) disconnected:`, reason);
        this.mainClient = null;
      });

      this.mainClient.on('loading_screen', (percent, message) => {
        logger.info(`Main WhatsApp client (${mainPhoneNumber}) loading: ${percent}% - ${message}`);
      });

      logger.info(`Starting WhatsAppMain client initialization for ${mainPhoneNumber}`);
      this.mainClient.initialize().catch(error => {
        clearTimeout(initTimeout);
        logger.error(`Error initializing main WhatsApp client (${mainPhoneNumber}):`, error);
        this.mainClient = null; // Сбрасываем клиент в случае ошибки
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

  async saveMainSession(phoneNumber) {
    const sessionDir = path.join(this.sessionDir, `session-${phoneNumber}`);
    try {
      await fs.access(sessionDir);
      logger.info(`Main WhatsApp session directory exists for ${phoneNumber}`);
      // Здесь вы можете добавить дополнительную логику сохранения сессии, если необходимо
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Main WhatsApp session directory does not exist for ${phoneNumber}`);
      } else {
        logger.error(`Error checking/saving main WhatsApp session for ${phoneNumber}:`, error);
      }
    }
  }
}

module.exports = new WhatsAppMainSessionService();