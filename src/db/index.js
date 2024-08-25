// src/db/index.js

const userRepo = require('./repositories/userRepo');
const leadsRepo = require('./repositories/leadsRepo');
const adminsRepo = require('./repositories/adminsRepo');
const campaignsRepo = require('./repositories/campaignsRepo');
const userLimitsRepo = require('./repositories/userLimitsRepo');
const phoneNumberRepo = require('./repositories/phoneNumberRepo');
const parsedUsersRepo = require('./repositories/parsedUsersRepo');
const messageStatsRepo = require('./repositories/messageStatsRepo');
const subscriptionsRepo = require('./repositories/subscriptionsRepo');

module.exports = {
  userRepo,
  leadsRepo,
  adminsRepo,
  campaignsRepo,
  userLimitsRepo,
  parsedUsersRepo,
  phoneNumberRepo,
  messageStatsRepo,
  subscriptionsRepo,
};