// src/messaging/index.js

const messageSender = require('./messageSender');
const messageProcessor = require('./messageProcessor');

module.exports = {
  ...messageSender,
  ...messageProcessor
};