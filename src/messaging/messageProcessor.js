// src/messaging/messageProcessor.js

const config = require('../config');
const { splitIntoSentences } = require('../utils/helpers');
const { simulateTyping, sendMessage, checkNewMessages } = require('./messageSender');
const axios = require('axios');
const logger = require('../utils/logger');
const { getClient } = require('../services/auth/authService');

async function processMessage(userId, message) {
  try {
    const sentences = splitIntoSentences(message);

    for (const sentence of sentences) {
      const typingDuration = Math.min(Math.max(sentence.length * 100, 2000), 5000);
      await simulateTyping(userId, typingDuration);
      
      if (await checkNewMessages(userId)) {
        logger.info('New message received, stopping response');
        break;
      }
      
      await sendMessage(userId, sentence);
    }
  } catch (error) {
    logger.error('Error processing message:', error);
    throw error;
  }
}

async function sendToChatbotService(conversationId, message, serviceUrl) {
  try {
    logger.info('Отправка сообщения в сервис чат-бота', { conversationId });
    const response = await axios.post(serviceUrl, {
      conversationId,
      message
    }, {
      headers: {
        'X-API-Key': config.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    logger.info('Сообщение успешно отправлено в сервис чат-бота', { conversationId, response: response.data });
    return response.data;
  } catch (error) {
    logger.error('Ошибка при отправке сообщения в сервис чат-бота', { 
      conversationId, 
      error: error.message, 
      stack: error.stack 
    });
    throw error;
  }
}

function setupMessageHandler(activeConversations) {
  const client = getClient();
  if (!client) {
    logger.error('Telegram client is not initialized. Cannot setup message handler.');
    return;
  }

  client.addEventHandler(async (update) => {
    if (update.className === 'UpdateNewMessage' && update.message.message) {
      const userId = update.message.senderId.toString();
      const message = update.message.message;
      const chatId = userId;

      logger.info('Received message:', message);

      const conversation = activeConversations.get(chatId);
      if (conversation && update.message.id > conversation.lastMessageId) {
        conversation.pendingSentences = [];
        
        try {
          await sendToChatbotService(conversation.conversationId, message, conversation.serviceUrl);
        } catch (error) {
          logger.error('Не удалось отправить сообщение в сервис чат-бота', { 
            chatId, 
            conversationId: conversation.conversationId, 
            error: error.message 
          });
        }
        
        conversation.lastMessageId = update.message.id;
        conversation.lastActivityTime = Date.now();
        activeConversations.set(chatId, conversation);
      }
    }
  });
}

module.exports = {
  processMessage,
  sendToChatbotService,
  setupMessageHandler
};