// src/services/whatsapp/src/WhatsAppSessionService.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('../../../utils/logger');
const { whatsappSessionsRepo } = require('../../../db');
const { phoneNumberService } = require('../../phone');

class WhatsAppSessionService {
  constructor() {
    this.clients = new Map();
    this.tempDir = path.join(process.cwd(), 'temp');
    this.sessionDir = path.join(this.tempDir, '.wwebjs_auth');
    this.cacheDir = path.join(this.tempDir, '.wwebjs_cache');
  }

  async createOrGetSession(phoneNumber) {
    logger.info(`Creating or getting WhatsApp session for ${phoneNumber}`);

    if (this.clients.has(phoneNumber)) {
      const client = this.clients.get(phoneNumber);
      if (client.isReady) {
        logger.info(`Existing ready client found for ${phoneNumber}`);
        return client;
      }
    }

    const cleanPhoneNumber = phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
    const sessionData = await whatsappSessionsRepo.getSession(phoneNumber);

    let client;
    if (sessionData) {
      client = new Client({
        session: sessionData,
        authStrategy: new LocalAuth({ clientId: cleanPhoneNumber }),
        dataPath: this.sessionDir,
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true,
          userDataDir: this.cacheDir
        }
      });
    } else {
      client = new Client({
        authStrategy: new LocalAuth({ clientId: cleanPhoneNumber }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true
        }
      });
    }

    this.clients.set(phoneNumber, client);

    await this.initializeClient(client, phoneNumber);

    return client;
  }

  async initializeClient(client, phoneNumber) {
    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        logger.info(`WhatsApp client ready for ${phoneNumber}`);
        client.isReady = true;
        resolve(client);
      });

      client.on('authenticated', async (session) => {
        logger.info(`WhatsApp client authenticated for ${phoneNumber}`);
        if (session) {
          logger.debug(`Session data for ${phoneNumber}:`, JSON.stringify(session));
          try {
            await this.saveSession(phoneNumber, session);
          } catch (error) {
            logger.error(`Error saving session for ${phoneNumber}:`, error);
          }
        } else {
          logger.warn(`No session data provided for ${phoneNumber} during authentication`);
        }
      });

      client.on('auth_failure', (msg) => {
        logger.error(`WhatsApp authentication failed for ${phoneNumber}: ${msg}`);
        this.clients.delete(phoneNumber);
        reject(new Error('WhatsApp authentication failed'));
      });

      client.initialize().catch(error => {
        logger.error(`Error initializing WhatsApp client for ${phoneNumber}:`, error);
        this.clients.delete(phoneNumber);
        reject(error);
      });
    });
  }


  async generateQRCode(phoneNumber) {
    logger.info(`Generating QR code for WhatsApp number ${phoneNumber}`);

    const client = await this.createOrGetSession(phoneNumber);

    return new Promise((resolve, reject) => {
      let qrGenerated = false;

      client.on('qr', async (qr) => {
        try {
          if (!qrGenerated) {
            qrGenerated = true;
            const qrImageData = await qrcode.toDataURL(qr);
            resolve(qrImageData.split(',')[1]);
          }
        } catch (error) {
          reject(error);
        }
      });

      // Добавляем таймаут на случай, если QR код не будет сгенерирован
      setTimeout(() => {
        if (!qrGenerated) {
          logger.error(`QR code generation timed out for ${phoneNumber}`);
          reject(new Error('QR code generation timed out'));
        }
      }, 60000); // 60 секунд таймаут
    });
  }



  async waitForAuthentication(phoneNumber, callback) {
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
      await phoneNumberService.setPhoneAuthenticated(phoneNumber, 'whatsapp', isAuthenticated);
      logger.info(`Updated WhatsApp authentication status for ${phoneNumber}: ${isAuthenticated}`);
    } catch (error) {
      logger.error(`Error updating WhatsApp authentication status for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async saveSession(phoneNumber, session) {
    try {
      if (!session) {
        logger.warn(`Attempt to save undefined or null session for ${phoneNumber}`);
        return;
      }
      const sessionString = typeof session === 'object' ? JSON.stringify(session) : session;
      await whatsappSessionsRepo.saveSession(phoneNumber, sessionString);
      logger.info(`WhatsApp session saved for ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error saving WhatsApp session for ${phoneNumber}:`, error);
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
    await whatsappSessionsRepo.updatePhoneNumberWhatsAppStatus(phoneNumber, false);
    logger.info(`WhatsApp session disconnected and removed for ${phoneNumber}`);
  }

  async initializeSessions() {
    logger.info('Initializing WhatsApp sessions');
    const sessions = await whatsappSessionsRepo.getAllSessions();
    for (const session of sessions) {
      try {
        const sessionData = await whatsappSessionsRepo.getSession(session.phoneNumber);
        const client = new Client({ session: sessionData });
        client.on('ready', () => {
          logger.info(`WhatsApp client reinitialized for ${session.phoneNumber}`);
          this.clients.set(session.phoneNumber, client);
        });
        await client.initialize();
      } catch (error) {
        logger.error(`Error initializing WhatsApp session for ${session.phoneNumber}:`, error);
      }
    }
  }
}

module.exports = new WhatsAppSessionService();