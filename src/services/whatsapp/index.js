// src/services/whatsapp/index.js

const botStateManager = require('./managers/botStateManager');
const onlineStatusManager = require('./managers/onlineStatusManager');
const WhatsAppSessionService = require('./services/WhatsAppSessionService');

module.exports = {
    botStateManager,
    onlineStatusManager,
    WhatsAppSessionService,
};