// src/db/postgres/config.js

const { Pool } = require('pg');
const config = require('../../config');

const pool = new Pool({
  user: config.POSTGRES_USER,
  host: config.POSTGRES_HOST,
  database: config.POSTGRES_DATABASE,
  password: config.POSTGRES_PASSWORD,
  port: config.POSTGRES_PORT,
  url: config.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};


