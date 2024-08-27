// src/db/index.js

const crmRepo = require('./repositories/crmRepo');
const userRepo = require('./repositories/userRepo');
const leadsRepo = require('./repositories/leadsRepo');
const dialogRepo = require('./repositories/dialogRepo');
const adminsRepo = require('./repositories/adminsRepo');
const userLimitsRepo = require('./repositories/userLimitsRepo');
const phoneNumberRepo = require('./repositories/phoneNumberRepo');
const parsedUsersRepo = require('./repositories/parsedUsersRepo');
const messageStatsRepo = require('./repositories/messageStatsRepo');
const subscriptionsRepo = require('./repositories/subscriptionsRepo');
const telegramSessionsRepo = require('./repositories/telegramSessionsRepo');
const campaignsMailingRepo = require('./repositories/campaignsMailingRepo');
const campaignsParsingRepo = require('./repositories/campaignsParsingRepo');

module.exports = {
  crmRepo,
  userRepo,
  leadsRepo,
  dialogRepo,
  adminsRepo,
  userLimitsRepo,
  parsedUsersRepo,
  phoneNumberRepo,
  messageStatsRepo,
  subscriptionsRepo,
  telegramSessionsRepo,
  campaignsMailingRepo,
  campaignsParsingRepo,
};