// src/config/index.js

require('dotenv').config();

module.exports = {
  API_ID: process.env.API_ID,
  API_HASH: process.env.API_HASH,
  PORT: process.env.PORT || 3000,
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
  AIRTABLE_PHONE_TABLE: process.env.AIRTABLE_PHONE_TABLE,
  AIRTABLE_PARSED_USERS_TABLE: process.env.AIRTABLE_PARSED_USERS_TABLE,
  AIRTABLE_ADMINS_TABLE: process.env.AIRTABLE_ADMINS_TABLE,
  AIRTABLE_PARSING_CAMPAIGNS_TABLE: process.env.AIRTABLE_PARSING_CAMPAIGNS_TABLE,
  API_KEY: process.env.API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};