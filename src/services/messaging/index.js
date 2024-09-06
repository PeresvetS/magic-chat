// src/services/messaging/index.js

const messageSender = require('./src/messageSender');
const messageProcessor = require('./src/messageProcessor');
const handleMessageService = require('./src/handleMessageService');

module.exports = {
  ...messageSender,
  ...messageProcessor,
  handleMessageService,
};
