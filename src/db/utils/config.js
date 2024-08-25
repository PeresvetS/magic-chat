// src/db/utils/config.js

const config = require('../../config');

const isProduction = process.env.NODE_ENV === 'production';

let databaseUrl;

if (isProduction) {
  // Конфигурация для Railway (production)
  databaseUrl = config.DATABASE_URL;
} else {
  // Конфигурация для локальной разработки
  const { POSTGRES_USER, POSTGRES_HOST, POSTGRES_DATABASE, POSTGRES_PASSWORD, POSTGRES_PORT } = config;
  databaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}`;
}

module.exports = {
  databaseUrl
};