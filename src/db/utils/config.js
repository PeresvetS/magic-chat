// src/db/utils/config.js

const config = require('../../config');

const databaseUrl = config.SUPABASE_URL;

module.exports = {
  databaseUrl,
};