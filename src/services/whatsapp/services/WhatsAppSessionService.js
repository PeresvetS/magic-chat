// src/services/whatsapp/src/WhatsAppSessionService.js

const path = require('path');
const fs = require('fs').promises;
const logger = require('../../../utils/logger');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { phoneNumberService } = require('../../phone');

class WhatsAppSessionService {
  constructor() {
    this.clients = new Map();
    this.messageHandlers = [];
    this.tempDir = path.join(process.cwd(), 'temp');
    this.sessionDir = path.join(this.tempDir, '.wwebjs_auth');
    this.authTimeout = 600000; // 10 минут
    this.initializationPromises = new Map();
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
    logger.info(`New message handler registered. Total handlers: ${this.messageHandlers.length}`);
  }

  async createOrGetSession(phoneNumber) {
    logger.info(`Creating or getting WhatsApp session for ${phoneNumber}`);

    if (this.clients.has(phoneNumber) && this.clients.get(phoneNumber).isReady) {
      logger.debug(`Using existing ready WhatsApp client for ${phoneNumber}`);
      return this.clients.get(phoneNumber);
    }

    await this.initializeClient(phoneNumber);
    return this.clients.get(phoneNumber);
  }

  async initializeClient(phoneNumber, retries = 3) {
    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
    logger.info(`Initializing WhatsApp client for ${phoneNumber}`);

    const client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: cleanPhoneNumber,
        dataPath: this.sessionDir,
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        timeout: 60000,
      }
    });

    return new Promise((resolve, reject) => {
      const initTimeout = setTimeout(() => {
        logger.error(`WhatsApp client initialization timeout for ${phoneNumber}`);
        client.destroy().catch(e => logger.error(`Error destroying client: ${e}`));
        reject(new Error('WhatsApp client initialization timeout'));
      }, this.authTimeout);

      client.on('ready', async () => {
        clearTimeout(initTimeout);
        logger.info(`WhatsApp client ready for ${phoneNumber}`);
        client.isReady = true;
        await this.saveSession(phoneNumber, client);
        resolve(client);
      });

    client.on('authenticated', () => {
      logger.info(`WhatsApp client authenticated for ${phoneNumber}`);
    });

    client.on('qr', async (qr) => {
      try {
        resolve(qr)
      } catch (error) {
        reject(error);
      }
    });

    client.on('loading_screen', (percent, message) => {
      logger.info(`Loading screen for ${phoneNumber}: ${percent}% - ${message}`);
      lastLoadingPercentage = percent;
    });

    client.on('auth_failure', (msg) => {
      clearTimeout(initTimeout);
      logger.error(`WhatsApp authentication failed for ${phoneNumber}: ${msg}`);
      client.destroy().catch(e => logger.error(`Error destroying client after auth failure: ${e}`));
      reject(new Error(`WhatsApp authentication failed: ${msg}`));
    });


    client.on('disconnected', (reason) => {
      logger.warn(`WhatsApp client disconnected for ${phoneNumber}: ${reason}`);
      this.clients.delete(phoneNumber);
      if (!client.isReady) {
        clearTimeout(initTimeout);
        reject(new Error(`WhatsApp client disconnected during initialization: ${reason}`));
      }
    });

    client.on('message', async (message) => {
      logger.info(`Received WhatsApp message for ${phoneNumber}: ${message.body}`);
      await this.handleIncomingMessage(message, phoneNumber);
    });

    logger.info(`Starting WhatsApp client initialization for ${phoneNumber}`);
      client.initialize().catch(error => {
        clearTimeout(initTimeout);
        logger.error(`Error initializing WhatsApp client for ${phoneNumber}:`, error);
        client.destroy().catch(e => logger.error(`Error destroying client after initialization error: ${e}`));
        if (retries > 0 && error.message.includes('network')) {
          logger.warn(`Network error during initialization for ${phoneNumber}. Retrying...`);
          setTimeout(() => {
            this.initializeClient(phoneNumber, retries - 1).then(resolve).catch(reject);
          }, 5000);
        } else {
          reject(error);
        }
      });
    });
  }

  async saveSession(phoneNumber) {
    const sessionDir = path.join(this.sessionDir, `session-${phoneNumber}`);
    try {
      await fs.access(sessionDir);
      logger.info(`WhatsApp session directory exists for ${phoneNumber}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`WhatsApp session directory does not exist for ${phoneNumber}`);
      } else {
        logger.error(`Error checking WhatsApp session for ${phoneNumber}:`, error);
      }
    }
  }

  async disconnectSession(phoneNumber) {
    logger.info(`Disconnecting WhatsApp session for ${phoneNumber}`);
    const client = this.clients.get(phoneNumber);
    if (client) {
      await client.destroy();
      this.clients.delete(phoneNumber);
    }
    logger.info(`WhatsApp session disconnected and removed for ${phoneNumber}`);
  }

  cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  async handleIncomingMessage(message, phoneNumber) {
    logger.info(`Handling incoming WhatsApp message for ${phoneNumber}: ${message.body}`);
    for (const handler of this.messageHandlers) {
      try {
        await handler(message, phoneNumber);
      } catch (error) {
        logger.error(`Error in message handler for ${phoneNumber}:`, error);
      }
    }
  }

  async updateAuthenticationStatus(phoneNumber, isAuthenticated) {
    try {
      await phoneNumberService.setPhoneAuthenticated(phoneNumber, 'whatsapp', isAuthenticated);
      logger.info(`Updated WhatsApp authentication status for ${phoneNumber}: ${isAuthenticated}`);
    } catch (error) {
      logger.error(`Error updating WhatsApp authentication status for ${phoneNumber}:`, error);
    }
  }
}

module.exports = new WhatsAppSessionService();