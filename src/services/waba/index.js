// src/services/waba/index.js

const botStateManager = require('./managers/botStateManager');
const WABASessionService = require('./services/WABASessionService');
const WABAAccountService = require('./services/WABAAccountService');
const onlineStatusManager = require('./managers/onlineStatusManager');

module.exports = {
    botStateManager,
    WABASessionService,
    WABAAccountService, 
    onlineStatusManager,
};