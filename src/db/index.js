// src/db/index.js

const userRepo = require('./repositories/userRepo');
const leadsRepo = require('./repositories/leadsRepo');
const adminsRepo = require('./repositories/adminsRepo');
const userLimitsRepo = require('./repositories/userLimitsRepo');
const phoneNumberRepo = require('./repositories/phoneNumberRepo');
const parsedUsersRepo = require('./repositories/parsedUsersRepo');
const messageStatsRepo = require('./repositories/messageStatsRepo');
const subscriptionsRepo = require('./repositories/subscriptionsRepo');
const campaignsMailingRepo = require('./repositories/campaignsMailingRepo');
const campaignsParsingRepo = require('./repositories/campaignsParsingRepo');

module.exports = {
  userRepo,
  leadsRepo,
  adminsRepo,
  userLimitsRepo,
  parsedUsersRepo,
  phoneNumberRepo,
  messageStatsRepo,
  subscriptionsRepo,
  campaignsMailingRepo,
  campaignsParsingRepo,
};