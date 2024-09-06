// src/services/mailing/index.js

const platformChecker = require('./checkers/MessagingPlatformChecker');
const senderService = require('./services/messageSenderService');
const distributionService = require('./services/messageDistributionService');

module.exports = {
  platformChecker,
  senderService,
  distributionService,
};
