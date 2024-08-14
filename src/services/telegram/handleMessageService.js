// src/services/telegram/handleMessageService.js

const logger = require('../../utils/logger');
const { Api } = require('telegram/tl');
const { safeStringify } = require('../../utils/helpers');
const OnlineStatusManager = require('../../services/telegram/onlineStatusManager');

const messageBuffer = new Map();
let isResponding = false;



async function handleIncomingMessage(phoneNumber, event, session) {
  const { processMessage, getCorrectPeer } = require('../../messaging');
  const message = event.message;

  logger.info(`Received event: ${JSON.stringify(event)}`);
  logger.info(`Message object: ${JSON.stringify(message)}`);

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

      // Добавляем случайную задержку перед открытием сообщения (в 50% случаев)
      if (Math.random() < 0.5) {
        const delay = Math.random() * 5000 + 5000;
        logger.info(`Delaying message read for ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        // Отмечаем сообщение как прочитанное
        const peer = await getCorrectPeer(session, senderId);
        logger.info(`Got correct peer for ${senderId}: ${JSON.stringify(peer)}`);
        await session.invoke(new Api.messages.ReadHistory({
          peer: peer,
          maxId: message.id
        }));
        logger.info(`Marked message as read for ${senderId}`);
      } catch (readError) {
        logger.warn(`Failed to mark message as read: ${readError.message}`);
      }

      logger.info(`Processing message from ${senderId}`);
      await processMessage(senderId, message.text, phoneNumber);
      logger.info(`Finished processing message from ${senderId}`);
    } catch (error) {
      logger.error(`Error processing message from ${senderId} to ${phoneNumber}:`, error);
    }
  } else {
    logger.info(`Skipping message: senderId=${senderId}, out=${message.out}, text=${message.text}`);
  }
}
async function processIncomingMessage(phoneNumber, event, session) {
  try {
    logger.info(`Received event for ${phoneNumber}: ${safeStringify(event)}`);
    
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

