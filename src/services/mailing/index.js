// src/services/mailing/index.js

const platformChecker = require('./checkers/MessagingPlatformChecker');
const MessageQuequeService = require('./services/messageQuequeService');
const MessageMailingService = require('./services/messageMailingService');
const MessageDistributionService = require('./services/messageDistributionService');

module.exports = {
  platformChecker,
  messageMailingService: MessageMailingService,
  distributionService: MessageDistributionService,
  messageQuequeService: MessageQuequeService,
};
