// src/messaging/index.js

const messageSender = require('./src/messageSender');
const messageProcessor = require('./src/messageProcessor');

module.exports = {
  ...messageSender,
  ...messageProcessor
};