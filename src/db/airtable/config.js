// src/db/airtable/config.js

const Airtable = require('airtable');
const config = require('../../config');

Airtable.configure({ apiKey: config.AIRTABLE_API_KEY });
const base = Airtable.base(config.AIRTABLE_BASE_ID);

module.exports = {
  phoneTable: base(config.AIRTABLE_PHONE_TABLE),
  parsedUsersTable: base(config.AIRTABLE_PARSED_USERS_TABLE),
  adminsTable: base(config.AIRTABLE_ADMINS_TABLE),
  parsingCampaignsTable: base(config.AIRTABLE_PARSING_CAMPAIGNS_TABLE),
  DEFAULT_MAX_INACTIVITY_TIME: 60 * 60 * 1000 // 60 минут в миллисекундах
};