// src/messaging/src/messageProcessor.js

const { generateResponse } = require('../../services/gpt/gptService');
const ContextManager = require('../../services/langchain/contextManager');
const { countTokens } = require('../../services/tokenizer/tokenizer');
const { simulateHumanBehavior, checkNewMessages } = require('./messageSender');
const logger = require('../../utils/logger');
const TelegramSessionService = require('../../services/telegram/telegramSessionService');
const { saveMessageStats, saveDialogToFile } = require('../../utils/messageUtils');

const contextManagers = new Map();

async function processMessage(userId, message, phoneNumber) {
  logger.info(`Processing message in processMessage function: ${message}`);
  try {
    if (!contextManagers.has(userId)) {
      contextManagers.set(userId, new ContextManager());
    }
    const contextManager = contextManagers.get(userId);

    await contextManager.addMessage({ role: 'human', content: message });
    const messages = await contextManager.getMessages();

    const systemPrompt = "You are a helpful assistant."; // Customize this
    logger.info(`Message processed, generating response`);
    const response = await generateResponse(messages, systemPrompt);
    logger.info(`Response generated: ${response}`);

    await contextManager.addMessage({ role: 'assistant', content: response });

    const tokenCount = countTokens(response);
    await saveMessageStats(userId, phoneNumber, tokenCount);
    await saveDialogToFile(userId, message, response);

    const session = await TelegramSessionService.getSession(phoneNumber);
    // Проверяем, нет ли новых сообщений перед началом симуляции
    if (await checkNewMessages(userId, session)) {
      logger.info('New message received before starting response, skipping');
      return;
    }

    logger.info(`Starting human behavior simulation for user ${userId}`);
    await simulateHumanBehavior(session, userId, response);
    logger.info(`Human behavior simulated for user ${userId}`);
  } catch (error) {
    logger.error(`Error in processMessage:`, error);
    throw error; // Перебрасываем ошибку, чтобы она была поймана в вызывающей функции
  }
}


module.exports = { processMessage };

