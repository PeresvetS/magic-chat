// src/services/telegram/handleMessageService.js

const logger = require('../../utils/logger');
const { Api } = require('telegram/tl');
const { safeStringify } = require('../../utils/helpers');
const OnlineStatusManager = require('./onlineStatusManager');

const messageBuffer = new Map();
let isResponding = false;


async function handleIncomingMessage(phoneNumber, event, session) {
  const { processMessage } = require('../../messaging');
  const { getCorrectPeer } = require('../../messaging/src/messageSender');
  
  try {
    const message = event.message;

    // logger.info(`Received event: ${safeStringify(event)}`);
    // logger.info(`Message object: ${safeStringify(message)}`);

    let senderId = null;
    if (message.fromId) {
      senderId = message.fromId.userId ? message.fromId.userId.toString() : null;
    } else if (message.peerId) {
      senderId = message.peerId.userId ? message.peerId.userId.toString() : null;
    }

    logger.info(`Extracted senderId: ${senderId}`);

    if (senderId && !message.out) {
      logger.info(`Processing message from ${senderId} to ${phoneNumber}: ${message.text}`);
      
      try {
        await OnlineStatusManager.setOnline(senderId, session);
        logger.info(`Set online status for ${senderId}`);
      } catch (error) {
        logger.error(`Error setting online status: ${safeStringify(error)}`);
      }

      if (Math.random() < 0.5) {
        const delay = Math.random() * 5000 + 5000;
        logger.info(`Delaying message read for ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        const peer = await getCorrectPeer(session, senderId);
        logger.info(`Got correct peer for ${senderId}: ${safeStringify(peer)}`);
        await session.invoke(new Api.messages.ReadHistory({
          peer: peer,
          maxId: message.id
        }));
        logger.info(`Marked message as read for ${senderId}`);
      } catch (readError) {
        logger.error(`Failed to mark message as read: ${safeStringify(readError)}`);
      }

      logger.info(`Processing message from ${senderId}`);
      await processMessage(senderId, message.text, phoneNumber);
      logger.info(`Finished processing message from ${senderId}`);
    } else {
      logger.info(`Skipping message: senderId=${senderId}, out=${message.out}, text=${message.text}`);
    }
  } catch (error) {
    logger.error(`Error in handleIncomingMessage: ${safeStringify(error)}`);
  }
}
async function processIncomingMessage(phoneNumber, event, session) {
  try {
    // logger.info(`Received event for ${phoneNumber}: ${safeStringify(event)}`);
    
    const message = event.message;
    if (!message) {
      logger.warn(`Event for ${phoneNumber} does not contain a message`);
      return;
    }

    // Изменим способ получения senderId
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

    if (isResponding) {
      isResponding = false;
      logger.info('Interrupting current response');
    }

    if (!messageBuffer.has(senderId)) {
      messageBuffer.set(senderId, { messages: [messageText], timer: null });
    } else {
      messageBuffer.get(senderId).messages.push(messageText);
      clearTimeout(messageBuffer.get(senderId).timer);
    }

    messageBuffer.get(senderId).timer = setTimeout(async () => {
      const bufferData = messageBuffer.get(senderId);
      const combinedMessage = bufferData.messages.join('\n');
      messageBuffer.delete(senderId);

      await handleIncomingMessage(phoneNumber, {
        message: {
          ...message,
          text: combinedMessage
        }
      }, session);
    }, 5000);  // 5 seconds wait

    logger.info(`Processed message for ${phoneNumber} from ${senderId}: ${safeStringify(messageText)}`);
  } catch (error) {
    logger.error(`Error processing incoming message for ${phoneNumber}:`, error);
  }
}

module.exports = { processIncomingMessage };

