const whapi = require('@api/whapi');
const logger = require('../../../utils/logger');
const config = require('../../../config');

class WhatsAppSessionService {
  constructor() {
    this.whapiToken = config.WHAPI_TOKEN;
    whapi.auth(this.whapiToken);
    this.messageHandlers = [];
  }

  async createOrGetSession(phoneNumber) {
    logger.info(`Creating or getting WhatsApp session for ${phoneNumber}`);
    return {
      sendMessage: async (to, body) => {
        return await whapi.sendMessageText({
          to,
          body,
          typing_time: 0
        });
      }
    };
  }

  async authenticateWithPhoneNumber(phoneNumber) {
    logger.info(`Attempting to authenticate WhatsApp for ${phoneNumber}`);
    try {
      const { data } = await whapi.checkHealth({ wakeup: true, channel_type: 'web' });
      if (data.status === 'healthy') {
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

  onMessage(handler) {
    this.messageHandlers.push(handler);
    logger.info(`New message handler registered. Total handlers: ${this.messageHandlers.length}`);
  }

  async generateQRCode(phoneNumber) {
    logger.info(`Generating QR code for WhatsApp number ${phoneNumber}`);
    try {
      const { data } = await whapi.loginUserImage({ accept: 'image/png' });
      return data;
    } catch (error) {
      logger.error(`Error generating QR code for WhatsApp number ${phoneNumber}:`, error);
      throw error;
    }
  }

  async setupWebhooks(webhookUrl) {
    try {
      const { data } = await whapi.resetChannelSettings({
        webhooks: [
          {
            events: [{ type: 'messages', method: 'post' }],
            mode: 'body',
            url: webhookUrl
          }
        ]
      });
      logger.info('Webhooks setup successful');
      return data;
    } catch (error) {
      logger.error('Error setting up webhooks:', error);
      throw error;
    }
  }

  async checkChannelHealth() {
    try {
      const { data } = await whapi.checkHealth({ wakeup: true, channel_type: 'web' });
      logger.info('Channel health status:', data);
      return data;
    } catch (error) {
      logger.error('Error checking channel health:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppSessionService();
