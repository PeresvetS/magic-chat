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

    if (this.initializationPromises.has(phoneNumber)) {
      logger.debug(`Waiting for existing initialization promise for ${phoneNumber}`);
      return this.initializationPromises.get(phoneNumber);
    }

    const initializationPromise = this.initializeClient(phoneNumber);
    this.initializationPromises.set(phoneNumber, initializationPromise);

    try {
      const client = await initializationPromise;
      this.clients.set(phoneNumber, client);
      return client;
    } finally {
      this.initializationPromises.delete(phoneNumber);
    }
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        headless: true,
        timeout: this.authTimeout
      }
    });

    client.on('qr', async (qr) => {
      try {
        resolve(qr)
      } catch (error) {
        reject(error);
      }
    });

    client.on('ready', () => {
      logger.info(`WhatsApp client ready for ${phoneNumber}`);
      client.isReady = true;
    });

    client.on('authenticated', () => {
      logger.info(`WhatsApp client authenticated for ${phoneNumber}`);
    });

    client.on('auth_failure', (msg) => {
      logger.error(`WhatsApp authentication failed for ${phoneNumber}: ${msg}`);
    });

    client.on('disconnected', (reason) => {
      logger.warn(`WhatsApp client disconnected for ${phoneNumber}: ${reason}`);
      this.clients.delete(phoneNumber);
    });

    client.on('message', async (message) => {
      logger.info(`Received WhatsApp message for ${phoneNumber}: ${message.body}`);
      await this.handleIncomingMessage(message, phoneNumber);
    });

    try {
      await client.initialize();
      await this.saveSession(phoneNumber);
      return client;
    } catch (error) {
      if (retries > 0 && error.message.includes('network')) {
        logger.warn(`Network error during initialization for ${phoneNumber}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.initializeClient(phoneNumber, retries - 1);
      }
      throw error;
    }
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