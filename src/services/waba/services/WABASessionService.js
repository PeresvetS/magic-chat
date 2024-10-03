// src/services/waba/services/WABASessionService.js

const { WhatsAppAPI } = require('whatsapp-api-js');
const { Text, Image, Document } = require('whatsapp-api-js/messages');

const config = require('../../../config');
const с = require('../../../config/constants');
const logger = require('../../../utils/logger');
const { wabaSessionsRepo } = require('../../../db');

class WABASessionService {
  constructor() {
    this.sessions = new Map();
    this.whatsapp = new WhatsAppAPI({
      token: config.WABA_TOKEN,
      appSecret: config.WABA_APP_SECRET,
      webhookVerifyToken: config.WABA_WEBHOOK_VERIFY_TOKEN,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.whatsapp.on.message = async ({
      phoneID,
      from,
      message,
      name,
      reply,
    }) => {
      logger.info(`Received message from ${name} (${from}) to bot ${phoneID}`);
      await this.processIncomingMessage(phoneID, from, message, name);
      await this.whatsapp.markAsRead(phoneID, message.id);
    };

    this.whatsapp.on.sent = ({ phoneID, to, message }) => {
      logger.info(`Bot ${phoneID} sent message to user ${to}`);
    };
  }

  async processIncomingMessage(phoneID, from, message, name) {
    // Implement your message processing logic here
    // You can use this.messageHandlers if you want to keep the existing structure
  }

  async createOrGetSession(phoneNumber) {
    logger.info(`Creating or getting WABA session for ${phoneNumber}`);

    if (this.sessions.has(phoneNumber)) {
      logger.debug(`Using existing WABA session for ${phoneNumber}`);
      return this.sessions.get(phoneNumber);
    }

    const sessionData = await wabaSessionsRepo.getSession(phoneNumber);
    if (sessionData && this.isTokenValid(sessionData)) {
      this.sessions.set(phoneNumber, sessionData);
      return sessionData;
    }

    return await this.authenticate(phoneNumber);
  }

  async authenticate(phoneNumber) {
    logger.info(`Authenticating WABA for ${phoneNumber}`);

    try {
      // Note: The actual authentication process may differ based on your WABA setup
      // This is a simplified example
      const sessionData = {
        phoneNumber,
        accessToken: this.whatsapp.token,
        tokenExpiresAt: new Date(
          Date.now() +
            durationDays *
              с.HOURS_IN_A_DAY *
              с.MINUTES_IN_AN_HOUR *
              с.SECONDS_IN_A_MINUTE *
              с.MILLISECONDS_IN_A_SECOND,
        ), // Assume token is valid for 24 hours
      };

      await wabaSessionsRepo.saveSession(
        phoneNumber,
        JSON.stringify(sessionData),
      );
      this.sessions.set(phoneNumber, sessionData);

      return sessionData;
    } catch (error) {
      logger.error(`Error authenticating WABA for ${phoneNumber}:`, error);
      throw error;
    }
  }

  isTokenValid(sessionData) {
    return (
      sessionData.tokenExpiresAt &&
      new Date(sessionData.tokenExpiresAt) > new Date()
    );
  }

  async sendMessage(phoneNumber, recipient, message) {
    logger.info(`Sending WABA message to ${recipient}`);

    try {
      const session = await this.createOrGetSession(phoneNumber);
      const response = await this.whatsapp.sendText(
        phoneNumber,
        recipient,
        message,
      );
      logger.info(`WABA message sent successfully to ${recipient}`);
      return response;
    } catch (error) {
      logger.error(`Error sending WABA message to ${recipient}:`, error);
      throw error;
    }
  }

  async sendImage(phoneNumber, recipient, imageUrl, caption) {
    logger.info(`Sending WABA image to ${recipient}`);

    try {
      const session = await this.createOrGetSession(phoneNumber);
      const response = await this.whatsapp.sendMessage(
        phoneNumber,
        recipient,
        new Image(imageUrl, false, caption),
      );
      logger.info(`WABA image sent successfully to ${recipient}`);
      return response;
    } catch (error) {
      logger.error(`Error sending WABA image to ${recipient}:`, error);
      throw error;
    }
  }

  async sendDocument(phoneNumber, recipient, documentUrl, filename) {
    logger.info(`Sending WABA document to ${recipient}`);

    try {
      const session = await this.createOrGetSession(phoneNumber);
      const response = await this.whatsapp.sendMessage(
        phoneNumber,
        recipient,
        new Document(documentUrl, false, undefined, filename),
      );
      logger.info(`WABA document sent successfully to ${recipient}`);
      return response;
    } catch (error) {
      logger.error(`Error sending WABA document to ${recipient}:`, error);
      throw error;
    }
  }

  async disconnectSession(phoneNumber) {
    logger.info(`Disconnecting WABA session for ${phoneNumber}`);
    this.sessions.delete(phoneNumber);
    await wabaSessionsRepo.deleteSession(phoneNumber);
  }

  getWebhookHandler() {
    return async (req, res) => {
      if (req.method === 'GET') {
        return this.whatsapp.get(req.query);
      }
      if (req.method === 'POST') {
        return await this.whatsapp.post(
          JSON.parse(req.body),
          req.body,
          req.headers['x-hub-signature-256'],
        );
      }
    };
  }
}

// module.exports = new WABASessionService();
