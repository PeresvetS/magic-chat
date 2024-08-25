// src/services/messaging/src/handleMessageService.js

const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');
const { processMessage } = require('./messageProcessor');
const BotStateManager = require('../../telegram/managers/botStateManager');
const { sendResponse } = require('./messageSender');

async function processIncomingMessage(phoneNumber, event) {
  try {
    const { senderId, messageText } = extractMessageInfo(event);
    if (!senderId || !messageText) return;

    logger.info(`Processing message for ${phoneNumber}: senderId=${senderId}, text=${messageText}`);

    const combinedMessage = await BotStateManager.handleIncomingMessage(phoneNumber, senderId, messageText);
    if (!combinedMessage) return;

    const response = await processMessage(senderId, combinedMessage, phoneNumber);
    if (response) {
      await sendResponse(senderId, response, phoneNumber);
    } else {
      logger.warn(`No response generated for message from ${senderId}`);
    }

    logger.info(`Processed message for ${phoneNumber} from ${senderId}: ${safeStringify(messageText)}`);
  } catch (error) {
    logger.error(`Error processing incoming message for ${phoneNumber}:`, error);
  }
}

function extractMessageInfo(event) {
  const message = event.message;
  if (!message) {
    logger.warn(`Event does not contain a message`);
    return {};
  }

  let senderId = null;
  if (message.fromId) {
    senderId = message.fromId.userId ? message.fromId.userId.toString() : null;
  } else if (message.peerId) {
    senderId = message.peerId.userId ? message.peerId.userId.toString() : null;
  }

  return { senderId, messageText: message.text };
}

module.exports = { processIncomingMessage };