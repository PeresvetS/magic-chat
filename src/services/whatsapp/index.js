// src/services/whatsapp/index.js

const botStateManager = require('./managers/botStateManager');
const onlineStatusManager = require('./managers/onlineStatusManager');
const WhatsAppSessionService = require('./services/WhatsAppSessionService');
const WhatsAppMainSessionService = require('./services/WhatsAppMainSessionService');

module.exports = {
    botStateManager,
    onlineStatusManager,
    WhatsAppSessionService,
    WhatsAppMainSessionService: new WhatsAppMainSessionService(),
};