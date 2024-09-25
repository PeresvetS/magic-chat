// src/services/whatsapp/index.js

const onlineStatusManager = require('./managers/onlineStatusManager');
const WhatsAppSessionService = require('./services/WhatsAppSessionService');

module.exports = {
  onlineStatusManager,
  WhatsAppSessionService,
};
