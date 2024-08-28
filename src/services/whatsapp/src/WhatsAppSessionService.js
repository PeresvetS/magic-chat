// src/services/whatsapp/src/WhatsAppSessionService.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('../../../utils/logger');
const { whatsappSessionsRepo } = require('../../../db');
const { phoneNumberService } = require('../../phone');

class WhatsAppSessionService {
  constructor() {
    this.clients = new Map();
  }

  async generateQRCode(phoneNumber) {
    logger.info(`Generating QR code for WhatsApp number ${phoneNumber}`);
    
    const cleanPhoneNumber = phoneNumber.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (this.clients.has(phoneNumber)) {
      logger.info(`Existing client found for ${phoneNumber}, destroying it`);
      const existingClient = this.clients.get(phoneNumber);
      await existingClient.destroy();
      this.clients.delete(phoneNumber);
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: cleanPhoneNumber }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        timeout: 60000
      }
    });
    
    this.clients.set(phoneNumber, client);
    logger.info(`New WhatsApp client created and set for ${phoneNumber}`);

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

      client.on('ready', () => {
        logger.info(`WhatsApp client ready for ${phoneNumber}`);
      });

      client.on('authenticated', () => {
        logger.info(`WhatsApp client authenticated for ${phoneNumber}`);
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

      // Добавляем таймаут на случай, если QR код не будет сгенерирован
      setTimeout(() => {
        if (!qrGenerated) {
          logger.error(`QR code generation timed out for ${phoneNumber}`);
          this.clients.delete(phoneNumber);
          reject(new Error('QR code generation timed out'));
        }
      }, 60000); // 30 секунд таймаут
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

  async saveSession(phoneNumber, client) {
    try {
      const session = await client.getState();
      await whatsappSessionsRepo.saveSession(phoneNumber, session);
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