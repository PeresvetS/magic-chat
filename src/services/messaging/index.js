// src/services/messaging/index.js

const handleMessageService = require('./src/handleMessageService');
const { processPendingMessages } = require('./src/messageProcessor');

module.exports = {
  handleMessageService,
  processPendingMessages,
};
