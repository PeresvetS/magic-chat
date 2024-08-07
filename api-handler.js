// api-handler.js

const express = require('express');
const { checkApiKey } = require('./src/api/middleware/checkApiKey');
const { handleSendMessage } = require('./src/api/handlers/messageHandler');
const { setupMessageHandler } = require('./src/messaging');
const { cleanupInactiveConversations } = require('./src/services/conversationManager');

const router = express.Router();

router.use(checkApiKey);

const activeConversations = new Map();

router.post('/send-message', handleSendMessage(activeConversations));

setupMessageHandler(activeConversations);

// Запускаем очистку каждые 30 минут
setInterval(() => cleanupInactiveConversations(activeConversations), 30 * 60 * 1000);

module.exports = router;