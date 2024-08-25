// src/services/mailing/index.js   

const platformChecker = require('./src/messagingPlatformChecker');
const senderService = require('./src/messageSenderService');
const distributionService = require('./src/messageDistributionService');

module.exports = {
  platformChecker,
  senderService,
  distributionService,
};