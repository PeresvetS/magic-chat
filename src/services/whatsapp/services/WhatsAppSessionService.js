// src/services/whatsapp/src/WhatsAppSessionService.js

const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const { LRUCache } = require('lru-cache');
const logger = require('../../../utils/logger');
const { whatsappSessionsRepo } = require('../../../db');
const { phoneNumberService } = require('../../phone');

class WhatsAppSessionService {
  constructor() {
    this.clients = new Map();
    this.messageHandlers = [];
    this.tempDir = path.join(process.cwd(), 'temp');
    this.sessionDir = path.join(this.tempDir, '.whapi_sessions');
    this.authPromises = new Map();
    this.authTimeout = 600000; // 10 минут
    this.sessionCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 60,
    });
    this.whapiToken = process.env.WHAPI_TOKEN;
  }
  async loadSession(phoneNumber) {
    const sessionFile = path.join(this.sessionDir, `${phoneNumber}.json`);
    try {
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
  
    if (this.clients.has(phoneNumber)) {
      logger.debug(`Using existing WhatsApp client for ${phoneNumber}`);
      return this.clients.get(phoneNumber);
    }
  
    const sessionData = await this.loadSession(phoneNumber);
  
    const client = {
      sendMessage: async (to, body) => {
        const response = await axios.post('https://gate.whapi.cloud/messages/text', {
          typing_time: 0,
          to: to,
          body: body
        }, {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${this.whapiToken}`
          }
        });
        return response.data;
      },
      // Добавьте другие методы API whapi по мере необходимости
    };
  
    this.clients.set(phoneNumber, client);
    this.sessionCache.set(phoneNumber, client);
    return client;
  }

  async initializeClient(client, phoneNumber) {
    // Этот метод может быть упрощен, так как whapi не требует инициализации клиента
    logger.info(`WhatsApp client initialized for ${phoneNumber}`);
    return client;
  }

  async authenticateWithPhoneNumber(phoneNumber) {
    logger.info(`Attempting to authenticate WhatsApp for ${phoneNumber}`);
    try {
      const response = await axios.get('https://gate.whapi.cloud/health', {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${this.whapiToken}`
        }
      });
      if (response.data.status === 'healthy') {
        logger.info(`WhatsApp authentication successful for ${phoneNumber}`);
        return this.createOrGetSession(phoneNumber);
      } else {
        throw new Error('Whapi token is invalid');
      }
    } catch (error) {
      logger.error(`WhatsApp authentication failed for ${phoneNumber}:`, error);
      throw error;
    }
  }

  async reauthorizeSession(phoneNumber) {
    logger.info(`Attempting to reauthorize WhatsApp session for ${phoneNumber}`);
    // Для whapi нет необходимости в реавторизации, так как используется токен
    // Просто создаем новую сессию
    return this.createOrGetSession(phoneNumber);
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
    try {
      const response = await axios.get('https://gate.whapi.cloud/users/login/image', {
        params: {
          wakeup: true
        },
        headers: {
          'accept': 'image/png',
          'authorization': `Bearer ${this.whapiToken}`
        },
        responseType: 'arraybuffer'
      });

      return response.data;
    } catch (error) {
      logger.error(`Error generating QR code for WhatsApp number ${phoneNumber}:`, error);
      throw error;
    }
  }

  async waitForAuthentication(pluspPhoneNumber, callback) {
    const phoneNumber = this.cleanPhoneNumber(pluspPhoneNumber);
    logger.info(`Waiting for authentication for ${phoneNumber}`);
    // Whapi не требует ожидания аутентификации
    // Вместо этого мы просто проверяем валидность токена
    try {
      await this.authenticateWithPhoneNumber(phoneNumber);
      await this.updateAuthenticationStatus(phoneNumber, true);
      await callback(true);
      return true;
    } catch (error) {
      logger.error(`WhatsApp authentication failed for ${phoneNumber}:`, error);
      await this.updateAuthenticationStatus(phoneNumber, false);
      await callback(false);
      throw error;
    }
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

  async saveSession(phoneNumber) {
    const sessionFile = path.join(this.sessionDir, `${phoneNumber}.json`);
    try {
      await fs.writeFile(sessionFile, JSON.stringify({ token: this.whapiToken }));
      logger.info(`WhatsApp session info saved for ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error saving WhatsApp session for ${phoneNumber}:`, error);
    }
  }

  async disconnectSession(phoneNumber) {
    logger.info(`Disconnecting WhatsApp session for ${phoneNumber}`);
    this.clients.delete(phoneNumber);
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
}

module.exports = new WhatsAppSessionService();
