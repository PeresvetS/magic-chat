// src/services/whatsapp/index.js

const onlineStatusManager = require('./managers/onlineStatusManager');
const WhatsAppSessionService = require('./services/WhatsAppSessionService');
const WhatsAppMainSessionService = require('./services/WhatsAppMainSessionService');

module.exports = {
  onlineStatusManager,
  WhatsAppSessionService,
  WhatsAppMainSessionService,
};
