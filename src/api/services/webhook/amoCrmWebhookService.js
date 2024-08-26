// src/api/services/webhook/amoCrmWebhookService.js

const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

async function processAmoCrmWebhook(data, user) {
  try {
    logger.info('Received AmoCRM webhook data:', { 
      userId: user.id, 
      data: safeStringify(data) 
    });

    // TODO: Implement AmoCRM webhook processing logic
    // This might include:
    // 1. Parsing the incoming data
    // 2. Validating the data
    // 3. Creating or updating leads in your system
    // 4. Sending notifications or triggering other actions

    logger.info('Successfully processed AmoCRM webhook', { userId: user.id });
  } catch (error) {
    logger.error('Error processing AmoCRM webhook', { 
      error: error.message, 
      stack: error.stack,
      userId: user.id,
      body: safeStringify(data)
    });
    throw error;
  }
}

module.exports = { processAmoCrmWebhook };