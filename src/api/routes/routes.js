// src/api/routes.js 

const express = require('express');
const { checkApiKey } = require('./middleware/checkApiKey');
const { handleSendMessage } = require('./handlers/messageHandler');
const { setupMessageHandler } = require('../services/messaging');
const { cleanupInactiveConversations } = require('../services/conversationManager');

const router = express.Router();

router.use(checkApiKey);

const activeConversations = new Map();

router.post('/send-message', handleSendMessage(activeConversations));

setupMessageHandler(activeConversations);

// Запускаем очистку каждые 30 минут
setInterval(() => cleanupInactiveConversations(activeConversations), 30 * 60 * 1000);

module.exports = router;