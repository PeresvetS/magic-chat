// src/config/index.js

require('dotenv').config();
const logger = require('../utils/logger');

const config = {
  API_ID: parseInt(process.env.API_ID, 10),
  API_HASH: process.env.API_HASH,
  PORT: process.env.PORT || 3000,
  API_KEY: process.env.API_KEY,
  POSTGRES_URL: process.env.POSTGRES_URL,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  USER_BOT_TOKEN: process.env.USER_BOT_TOKEN,
  ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN,
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  MAIN_TG_PHONE_NUMBER: process.env.MAIN_TG_PHONE_NUMBER,
  MAIN_WA_PHONE_NUMBER: process.env.MAIN_WA_PHONE_NUMBER,
  NOTIFICATION_BOT_TOKEN: process.env.NOTIFICATION_BOT_TOKEN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
  ALLOWED_ADMINS: process.env.ALLOWED_ADMINS
    ? process.env.ALLOWED_ADMINS.split(',').map((id) => parseInt(id.trim(), 10))
    : [],
  // PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
  // WABA_APP_ID: process.env.WABA_APP_ID,
  // WABA_APP_SECRET: process.env.WABA_APP_SECRET,
  // WABA_PHONE_NUMBER_ID: process.env.WABA_PHONE_NUMBER_ID,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
  PINECONE_INDEX: process.env.PINECONE_INDEX,

  // Добавляем конфигурацию RabbitMQ
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost',
  RABBITMQ_QUEUE: process.env.RABBITMQ_QUEUE || 'messageQueue',
  RABBITMQ_PREFETCH: parseInt(process.env.RABBITMQ_PREFETCH, 10) || 1,
  RABBITMQ_HEARTBEAT: parseInt(process.env.RABBITMQ_HEARTBEAT, 10) || 60,
};

// Логирование конфигурации
logger.info('Configuration loaded:');
Object.entries(config).forEach(([key, value]) => {
  if (
    key.includes('TOKEN') ||
    key.includes('KEY') ||
    key.includes('PASSWORD') ||
    key.includes('URL')  // Добавляем URL в список скрываемых значений
  ) {
    logger.info(`${key}: ${value ? '[REDACTED]' : 'Not set'}`);
  } else if (key === 'ALLOWED_ADMINS') {
    logger.info(`${key}: ${JSON.stringify(value)}`);
  } else {
    logger.info(`${key}: ${value || 'Not set'}`);
  }
});

module.exports = config;
