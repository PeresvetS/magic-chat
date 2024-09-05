// src/services/whatsapp/src/WhatsAppSessionService.js

const venom = require('venom-bot');
const { LRUCache } = require('lru-cache');
const logger = require('../../../utils/logger');
const { whatsappSessionsRepo } = require('../../../db');
const { phoneNumberService } = require('../../phone');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppSessionService {
  constructor() {
    this.clients = new Map();
    this.messageHandlers = [];
    this.sessionCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 60 
    });
    this.sessionsPath = path.join(__dirname, '../../../../tokens');
  }

  async createSession(phoneNumber, useExistingSession = false) {
    logger.info(`${useExistingSession ? 'Loading' : 'Creating'} WhatsApp session for ${phoneNumber}`);
    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
    const sessionName = `session-${cleanPhoneNumber}`;
    const sessionPath = path.join(this.sessionsPath, sessionName);

    const options = {
      multidevice: true,
      headless: 'new',
      useChrome: true,
      debug: false,
      logQR: !useExistingSession, // Отключаем логирование QR, если используем существующую сессию
      browserArgs: ['--no-sandbox'],
      createPathFileToken: true,
      disableWelcome: true,
      updatesLog: true,
      autoClose: 60000,
      folderNameToken: this.sessionsPath,
      puppeteerOptions: {
        userDataDir: sessionPath
      }
    };

    if (useExistingSession) {
      options.session = sessionName;
    }
    
    return new Promise((resolve, reject) => {
      venom
        .create(
          sessionName,
          (base64Qr, asciiQR, attempts, urlCode) => {
            logger.info(`QR Code generated for ${phoneNumber}. Attempt: ${attempts}`);
            // Здесь можно добавить логику для отправки QR-кода пользователю
          },
          (statusSession, session) => {
            logger.info(`Status Session for ${phoneNumber}: ${statusSession}`);
            if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess' || statusSession === 'inChat') {
              this.clients.set(phoneNumber, session);
              this.sessionCache.set(phoneNumber, session);
              this.setupMessageListener(session, phoneNumber);
              resolve(session);
            }
          },
          options
        )
        .catch((error) => {
          logger.error(`Error ${useExistingSession ? 'loading' : 'creating'} WhatsApp session for ${phoneNumber}:`, error);
          reject(error);
        });
    });
  }

  setupMessageListener(client, phoneNumber) {
    client.onMessage((message) => {
      this.handleIncomingMessage(message, phoneNumber);
    });
  }

  async checkExistingSession(phoneNumber) {
    const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
    const sessionPath = path.join(this.sessionsPath, `session-${cleanPhoneNumber}`);
    try {
      await fs.access(sessionPath);
      // Проверяем наличие ключевых файлов сессии
      const files = await fs.readdir(sessionPath);
      return files.some(file => file.includes('session') || file.includes('tokens'));
    } catch (error) {
      logger.error(`Error checking existing session for ${phoneNumber}:`, error);
      return false;
    }
  }
 
  async getOrCreateSession(phoneNumber) {
    if (this.clients.has(phoneNumber)) {
      return this.clients.get(phoneNumber);
    }

    const sessionExists = await this.checkExistingSession(phoneNumber);
    if (sessionExists) {
      logger.info(`Using existing session for ${phoneNumber}`);
      try {
        return await this.createSession(phoneNumber, true);
      } catch (error) {
        logger.error(`Failed to load existing session for ${phoneNumber}, creating new one:`, error);
      }
    }

    logger.info(`Creating new session for ${phoneNumber}`);
    return this.createSession(phoneNumber, false);
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
    logger.info(`New message handler registered. Total handlers: ${this.messageHandlers.length}`);
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

  async checkNumber(phoneNumber) {
    logger.info(`Checking WhatsApp for number ${phoneNumber}`);
    try {
      const client = await this.getOrCreateSession(phoneNumber);
      const isRegistered = await client.checkNumberStatus(`${phoneNumber}@c.us`);
      logger.info(`Is number ${phoneNumber} registered on WhatsApp: ${isRegistered.canReceiveMessage}`);
      return isRegistered.canReceiveMessage;
    } catch (error) {
      logger.error(`Error checking WhatsApp for number ${phoneNumber}:`, error);
      return false;
    }
  }

  async sendMessage(phoneNumber, message) {
    logger.info(`Sending message to ${phoneNumber}`);
    try {
      const client = await this.getOrCreateSession(phoneNumber);
      await client.sendText(`${phoneNumber}@c.us`, message);
      logger.info(`Message sent to ${phoneNumber} successfully`);
    } catch (error) {
      logger.error(`Error sending message to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async sendImageAsSticker(phoneNumber, imagePath) {
    logger.info(`Sending image as sticker to ${phoneNumber}`);
    try {
      const client = await this.getOrCreateSession(phoneNumber);
      await client.sendImageAsSticker(`${phoneNumber}@c.us`, imagePath);
      logger.info(`Sticker sent to ${phoneNumber} successfully`);
    } catch (error) {
      logger.error(`Error sending sticker to ${phoneNumber}:`, error);
      throw error;
    }
  }

  async getStatus(phoneNumber) {
    logger.info(`Getting status for ${phoneNumber}`);
    try {
      const client = await this.getOrCreateSession(phoneNumber);
      const status = await client.getStatus(`${phoneNumber}@c.us`);
      return status;
    } catch (error) {
      logger.error(`Error getting status for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async disconnectSession(phoneNumber) {
    logger.info(`Disconnecting WhatsApp session for ${phoneNumber}`);
    const client = this.clients.get(phoneNumber);
    if (client) {
      try {
        await client.close();
        logger.info(`WhatsApp client closed for ${phoneNumber}`);
      } catch (error) {
        logger.error(`Error closing WhatsApp client for ${phoneNumber}:`, error);
      }
      this.clients.delete(phoneNumber);
      this.sessionCache.del(phoneNumber);
    }

    try {
      await whatsappSessionsRepo.deleteSession(phoneNumber);
    } catch (error) {
      logger.warn(`Failed to delete WhatsApp session for ${phoneNumber} from database:`, error);
    }

    try {
      await phoneNumberService.updatePhoneWhatsAppStatus(phoneNumber, false);
      logger.info(`WhatsApp status updated for ${phoneNumber}: disconnected`);
    } catch (error) {
      logger.error(`Error updating WhatsApp status for ${phoneNumber}:`, error);
    }
  }

  cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[^a-zA-Z0-9]/g, '');
  }

  async dispose() {
    for (const [phoneNumber, client] of this.clients.entries()) {
      try {
        await client.close();
        logger.info(`WhatsApp client closed for ${phoneNumber}`);
      } catch (error) {
        logger.error(`Error closing WhatsApp client for ${phoneNumber}:`, error);
      }
    }
    this.clients.clear();
    this.sessionCache.clear();
  }
}

module.exports = new WhatsAppSessionService();