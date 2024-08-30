// src/db/index.js

const crmRepo = require('./repositories/crmRepo');
const userRepo = require('./repositories/userRepo');
const leadsRepo = require('./repositories/leadsRepo');
const dialogRepo = require('./repositories/dialogRepo');
const adminsRepo = require('./repositories/adminsRepo');
const promptRepo = require('./repositories/promptRepo');
const userLimitsRepo = require('./repositories/userLimitsRepo');
const phoneNumberRepo = require('./repositories/phoneNumberRepo');
const parsedUsersRepo = require('./repositories/parsedUsersRepo');
const messageStatsRepo = require('./repositories/messageStatsRepo');
const subscriptionsRepo = require('./repositories/subscriptionsRepo');
const whatsappSessionsRepo = require('./repositories/whatsappSessionsRepo');
const telegramSessionsRepo = require('./repositories/telegramSessionsRepo');
const campaignsMailingRepo = require('./repositories/campaignsMailingRepo');
const campaignsParsingRepo = require('./repositories/campaignsParsingRepo');


module.exports = {
  crmRepo,
  userRepo,
  leadsRepo,
  dialogRepo,
  adminsRepo,
  promptRepo,
  userLimitsRepo,
  parsedUsersRepo,
  phoneNumberRepo,
  messageStatsRepo,
  subscriptionsRepo,
  whatsappSessionsRepo,
  telegramSessionsRepo,
  campaignsMailingRepo,
  campaignsParsingRepo,
};