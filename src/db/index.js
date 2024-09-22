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
const wabaSessionsRepo = require('./repositories/wabaSessionsRepo');
const subscriptionsRepo = require('./repositories/subscriptionsRepo');
const knowledgeBaseRepo = require('./repositories/knowledgeBaseRepo');
const rabbitMQQueueRepo = require('./repositories/rabbitMQQueueRepo');
const telegramSessionsRepo = require('./repositories/telegramSessionsRepo');
const campaignsMailingRepo = require('./repositories/campaignsMailingRepo');
const whatsappSessionsRepo = require('./repositories/whatsappSessionsRepo');
const conversationStateRepo = require('./repositories/conversationStateRepo');
const phoneNumberCampaignRepo = require('./repositories/phoneNumberCampaignRepo');
const leadProfileRepo = require('./repositories/leadProfileRepo');

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
  wabaSessionsRepo,
  messageStatsRepo,
  subscriptionsRepo,
  knowledgeBaseRepo,
  rabbitMQQueueRepo,
  whatsappSessionsRepo,
  telegramSessionsRepo,
  campaignsMailingRepo,
  conversationStateRepo,
  phoneNumberCampaignRepo,
  leadProfileRepo,
};
