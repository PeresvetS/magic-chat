// src/config/index.js

require('dotenv').config();
const logger = require('../utils/logger');

const config = {
  API_ID: parseInt(process.env.API_ID, 10),
  API_HASH: process.env.API_HASH,
  PORT: process.env.PORT || 3000,
  API_KEY: process.env.API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  USER_BOT_TOKEN: process.env.USER_BOT_TOKEN,
  ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN,
  ALLOWED_ADMINS: process.env.ALLOWED_ADMINS ? process.env.ALLOWED_ADMINS.split(',').map(id => parseInt(id.trim(), 10)) : [],
  POSTGRES_URL: process.env.POSTGRES_URL,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
};

// Логирование конфигурации
logger.info('Configuration loaded:');
Object.entries(config).forEach(([key, value]) => {
  if (key.includes('TOKEN') || key.includes('KEY') || key.includes('PASSWORD')) {
    logger.info(`${key}: ${value ? '[REDACTED]' : 'Not set'}`);
  } else if (key === 'ALLOWED_ADMINS') {
    logger.info(`${key}: ${JSON.stringify(value)}`);
  } else {
    logger.info(`${key}: ${value || 'Not set'}`);
  }
});

module.exports = config;
