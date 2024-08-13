// src/services/user/index.js   

const userService = require('./src/userService');
const subscriptionService = require('./src/subscriptionService');
const limitService = require('./src/limitService');
const userPhoneService = require('./src/userPhoneService');

module.exports = {
  ...userService,
  ...subscriptionService,
  ...limitService,
  ...userPhoneService,
};