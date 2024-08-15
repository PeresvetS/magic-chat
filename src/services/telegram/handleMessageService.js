// src/services/telegram/handleMessageService.js

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const { processMessage } = require('../../messaging');
const { sendResponse } = require('../../messaging/src/messageSender');
const BotStateManager = require('./botStateManager');
// const rateLimiter = require('./rateLimiter');

async function processIncomingMessage(phoneNumber, event, session) {
  try {
    const message = event.message;
    if (!message) {
      logger.warn(`Event for ${phoneNumber} does not contain a message`);
      return;
    }

    let senderId = null;
    if (message.fromId) {
      senderId = message.fromId.userId ? message.fromId.userId.toString() : null;
    } else if (message.peerId) {
      senderId = message.peerId.userId ? message.peerId.userId.toString() : null;
    }

    const messageText = message.text;

    logger.info(`Processing message for ${phoneNumber}: senderId=${senderId}, text=${messageText}`);

    if (!senderId) {
      logger.warn(`Message for ${phoneNumber} does not have a valid senderId`);
      return;
    }

    const combinedMessage = await BotStateManager.handleIncomingMessage(session, senderId, messageText);

    if (combinedMessage) {
      const response = await processMessage(senderId, combinedMessage, phoneNumber);
      if (response) {
        await sendResponse(session, senderId, response, phoneNumber);
      } else {
        logger.warn(`No response generated for message from ${senderId}`);
      }
    }

    logger.info(`Processed message for ${phoneNumber} from ${senderId}: ${safeStringify(messageText)}`);
  } catch (error) {
    logger.error(`Error processing incoming message for ${phoneNumber}:`, error);
  }
}

module.exports = { processIncomingMessage };