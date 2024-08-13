// src/db/index.js

const phoneNumbers = require('./postgres/phoneNumbers');
const campaigns = require('./postgres/campaigns');
const parsedUsers = require('./postgres/parsedUsers');
const admins = require('./postgres/admins');
const subscriptions = require('./postgres/subscriptions');

module.exports = {
  ...phoneNumbers,
  ...campaigns,
  ...parsedUsers,
  ...admins,
  ...subscriptions,
};