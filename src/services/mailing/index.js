// src/services/mailing/index.js   

const MessagingPlatformChecker = require('./src/messagingPlatformChecker');
const MessageSenderService = require('./src/messageSenderService');
const MessageDistributionService = require('./src/messageDistributionService');

module.exports = {
  MessageDistributionService,
  MessageSenderService,
  MessagingPlatformChecker,
};