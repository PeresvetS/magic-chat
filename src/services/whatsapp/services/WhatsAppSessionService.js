// src/services/whatsapp/src/WhatsAppSessionService.js

const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const { LRUCache } = require('lru-cache');
const { Client, LocalAuth } = require('whatsapp-web.js');

const logger = require('../../../utils/logger');
const { whatsappSessionsRepo } = require('../../../db');
const { phoneNumberService } = require('../../phone');

class WhatsAppSessionService {
  constructor() {
    this.clients = new Map();
    this.messageHandlers = [];
    this.sessionDir = path.join(process.cwd(), '.wwebjs_auth');
    this.authPromises = new Map();
    this.authTimeout = 600000; // 10 минут
    this.sessionCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 60,
    });
    this.autoSaveInterval = setInterval(
      () => this.autoSaveSessions(),
      5 * 60 * 1000,
    ); // Каждые 5 минут
  }

  async autoSaveSessions() {
    for (const [phoneNumber, client] of this.clients.entries()) {
      if (client.isReady) {
        await this.saveSession(this.cleanPhoneNumber(phoneNumber), client);
      }
    }
  }

  async loadSession(phoneNumber) {
    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
    const sessionDir = path.join(
      this.sessionDir,
      `session-${cleanPhoneNumber}`,
    );
    try {
      const sessionFile = path.join(sessionDir, 'session.json');
      const sessionData = await fs.readFile(sessionFile, 'utf8');
      logger.info(`Сессия WhatsApp загружена для номера ${cleanPhoneNumber}`);
      return JSON.parse(sessionData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info(
          `Сессия WhatsApp не найдена для номера ${cleanPhoneNumber}`,
        );
      } else {
        logger.error(
          `Ошибка при загрузке сессии WhatsApp для номера ${cleanPhoneNumber}:`,
          error,
        );
      }
      return null;
    }
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
    logger.info(
      `New message handler registered. Total handlers: ${this.messageHandlers.length}`,
    );
  }

  async createOrGetSession(phoneNumber) {
    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
    logger.info(`Creating or getting WhatsApp session for ${phoneNumber}`);

    if (this.clients.has(cleanPhoneNumber)) {
      const existingClient = this.clients.get(cleanPhoneNumber);
      logger.info(`existingClient = ${util.inspect(existingClient)}`);
      if (existingClient.isReady) {
        return existingClient;
      }
    }

    const sessionData = await this.loadSession(cleanPhoneNumber);

    const clientOptions = {
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
      },
    };

    if (sessionData) {
      clientOptions.session = sessionData;
    }

    const newClient = new Client(clientOptions);

    try {
      await this.initializeClient(newClient, phoneNumber);
      this.clients.set(cleanPhoneNumber, newClient);
      this.sessionCache.set(cleanPhoneNumber, newClient);
      return newClient;
    } catch (error) {
      logger.error(
        `Failed to initialize WhatsApp client for ${cleanPhoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  async initializeClient(client, phoneNumber) {
    return new Promise((resolve, reject) => {
      const initTimeout = setTimeout(() => {
        logger.error(
          `WhatsApp client initialization timeout for ${phoneNumber}`,
        );
        client
          .destroy()
          .catch((e) => logger.error(`Error destroying client: ${e}`));
        reject(new Error('WhatsApp client initialization timeout'));
      }, this.authTimeout);

      client.on('qr', async (qr) => {
        const existingSession = await this.loadSession(phoneNumber);
        if (existingSession) {
          logger.info(
            `Существующая сессия найдена для ${phoneNumber}, пропуск генерации QR-кода`,
          );
          return;
        }
        logger.info(`QR code received for ${phoneNumber}`);
        // Здесь логика для отображения QR-кода пользователю
      });

      client.on('loading_screen', (percent, message) => {
        logger.info(
          `Loading screen for ${phoneNumber}: ${percent}% - ${message}`,
        );
      });

      client.on('ready', async () => {
        clearTimeout(initTimeout);
        this.dispose();
        logger.info(`WhatsApp client ready for ${phoneNumber}`);
        client.isReady = true;
        await this.saveSession(phoneNumber, client);
        resolve(client);
      });

      client.on('authenticated', () => {
        logger.info(`WhatsApp client authenticated for ${phoneNumber}`);
      });

      client.on('auth_failure', (msg) => {
        clearTimeout(initTimeout);
        this.dispose();
        logger.error(
          `WhatsApp authentication failed for ${phoneNumber}: ${msg}`,
        );
        reject(new Error('WhatsApp authentication failed'));
      });

      client.on('disconnected', (reason) => {
        logger.warn(
          `WhatsApp client disconnected for ${phoneNumber}: ${reason}`,
        );
        if (!client.isReady) {
          clearTimeout(initTimeout);
          this.dispose();
          reject(
            new Error(
              `WhatsApp client disconnected during initialization: ${reason}`,
            ),
          );
        }
      });

      logger.info(`Starting WhatsApp client initialization for ${phoneNumber}`);
      client.initialize().catch((error) => {
        clearTimeout(initTimeout);
        this.dispose();
        logger.error(
          `Error initializing WhatsApp client for ${phoneNumber}:`,
          error,
        );
        reject(error);
      });
    });
  }

  async authenticateWithPhoneNumber(phoneNumber) {
    logger.info(`Attempting to authenticate WhatsApp for ${phoneNumber}`);

    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);

    if (this.authPromises.has(cleanPhoneNumber)) {
      logger.info(
        `Auth promise already exists for ${phoneNumber}, waiting for authentication`,
      );
      return this.authPromises.get(cleanPhoneNumber).promise;
    }

    const authPromise = new Promise((resolve, reject) => {
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: cleanPhoneNumber }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true,
        },
      });

      client.on('qr', (qr) => {
        logger.info(
          `QR code received for ${phoneNumber} during phone authentication`,
        );
        // Здесь можно добавить логику для отображения QR-кода пользователю, если необходимо
      });

      client.on('ready', async () => {
        logger.info(`WhatsApp client is ready for ${phoneNumber}`);
        await this.saveSession(phoneNumber, client.pupPage.cookies);
        this.clients.set(phoneNumber, client);
        resolve(client);
      });

      client.on('auth_failure', (msg) => {
        logger.error(`Authentication failed for ${phoneNumber}: ${msg}`);
        reject(new Error(`Authentication failed: ${msg}`));
      });

      client.initialize().catch((error) => {
        logger.error(
          `Error initializing WhatsApp client for ${phoneNumber}:`,
          error,
        );
        reject(error);
      });
    });

    this.authPromises.set(cleanPhoneNumber, { promise: authPromise });

    return authPromise;
  }

  async reauthorizeSession(phoneNumber) {
    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
    logger.info(
      `Attempting to reauthorize WhatsApp session for ${cleanPhoneNumber}`,
    );
    await this.disconnectSession(cleanPhoneNumber);
    return this.createOrGetSession(cleanPhoneNumber);
  }

  cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  async handleIncomingMessage(message, phoneNumber) {
    logger.info(
      `Handling incoming WhatsApp message for ${phoneNumber}: ${message.body}`,
    );

    for (const handler of this.messageHandlers) {
      try {
        await handler(message, phoneNumber);
      } catch (error) {
        logger.error(`Error in message handler for ${phoneNumber}:`, error);
      }
    }
  }

  async generateQRCode(phoneNumber) {
    logger.info(`Generating QR code for WhatsApp number ${phoneNumber}`);

    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);

    return new Promise((resolve, reject) => {
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: cleanPhoneNumber }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true,
        },
      });

      let qrCodeResolved = false;

      client.on('qr', (qr) => {
        if (!qrCodeResolved) {
          qrCodeResolved = true;
          resolve({ qr, client });
        }
      });

      client.on('ready', async () => {
        logger.info(`WhatsApp client is ready for ${phoneNumber}`);
        await this.saveSession(cleanPhoneNumber, client.pupPage.cookies);
        this.clients.set(cleanPhoneNumber, client);
        if (!qrCodeResolved) {
          qrCodeResolved = true;
          resolve({ qr: null, client });
        }
      });

      client.on('auth_failure', (msg) => {
        reject(new Error(`Authentication failed: ${msg}`));
      });

      client.initialize().catch((error) => {
        logger.error(
          `Error initializing WhatsApp client for ${phoneNumber}:`,
          error,
        );
        reject(error);
      });
    });
  }

  async waitForAuthentication(pluspPhoneNumber, callback) {
    const phoneNumber = this.cleanPhoneNumber(pluspPhoneNumber);
    logger.info(`Waiting for authentication for ${phoneNumber}`);
    const client = this.clients.get(phoneNumber);
    if (!client) {
      logger.error(`No WhatsApp client found for ${phoneNumber}`);
      throw new Error(`No WhatsApp client found for ${phoneNumber}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.error(`Authentication timeout for ${phoneNumber}`);
        this.clients.delete(phoneNumber);
        reject(new Error('Authentication timeout'));
      }, 300000); // 5 minutes timeout

      client.on('authenticated', async () => {
        clearTimeout(timeout);
        logger.info(`WhatsApp authenticated for ${phoneNumber}`);
        await this.updateAuthenticationStatus(phoneNumber, true);
        await callback(true);
        resolve(true);
      });

      client.on('auth_failure', async (msg) => {
        clearTimeout(timeout);
        logger.error(`WhatsApp auth failure for ${phoneNumber}: ${msg}`);
        this.clients.delete(phoneNumber);
        await this.updateAuthenticationStatus(phoneNumber, false);
        await callback(false);
        reject(new Error(`Authentication failed: ${msg}`));
      });
    });
  }

  async updateAuthenticationStatus(phoneNumber, isAuthenticated) {
    try {
      await phoneNumberService.setPhoneAuthenticated(
        this.cleanPhoneNumber(phoneNumber),
        'whatsapp',
        isAuthenticated,
      );
      logger.info(
        `Updated WhatsApp authentication status for ${phoneNumber}: ${isAuthenticated}`,
      );
    } catch (error) {
      logger.error(
        `Error updating WhatsApp authentication status for ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  async saveSession(plusPhoneNumber) {
    const phoneNumber = this.cleanPhoneNumber(plusPhoneNumber);
    const sessionDir = path.join(this.sessionDir, `session-${phoneNumber}`);
    try {
      // Проверяем, существует ли директория сессии
      await fs.access(sessionDir);

      // Если директория существует, считаем, что сессия сохранена
      logger.info(
        `WhatsApp session directory ${sessionDir} exists for ${phoneNumber}`,
      );

      // Здесь мы могли бы сохранить дополнительную информацию о сессии, если это необходимо
      await whatsappSessionsRepo.saveSession(
        phoneNumber,
        JSON.stringify({ exists: true }),
      );

      logger.info(`WhatsApp session info saved for ${phoneNumber}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(
          `WhatsApp session directory does not exist for ${phoneNumber}`,
        );
      } else {
        logger.error(
          `Error checking/saving WhatsApp session for ${phoneNumber}:`,
          error,
        );
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
    await whatsappSessionsRepo.deleteSession(phoneNumber);
    this.sessionCache.delete(phoneNumber);
    logger.info(`WhatsApp session disconnected and removed for ${phoneNumber}`);
  }

  async initializeSessions() {
    logger.info('Initializing WhatsApp sessions');
    const sessions = await whatsappSessionsRepo.getAllSessions();
    for (const session of sessions) {
      try {
        await this.createOrGetSession(session.phoneNumber);
      } catch (error) {
        logger.error(
          `Error initializing WhatsApp session for ${session.phoneNumber}:`,
          error,
        );
      }
    }
  }

  // Не забудьте очистить интервал при завершении работы сервиса
  dispose() {
    clearInterval(this.autoSaveInterval);
  }
}

module.exports = new WhatsAppSessionService();
