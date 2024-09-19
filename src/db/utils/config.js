// src/db/utils/config.js

const config = require('../../config');

const databaseUrl = config.SUPABASE_URL;

const rabbitMQ = {
  url: config.RABBITMQ_URL,
  queue: config.RABBITMQ_QUEUE,
  prefetch: config.RABBITMQ_PREFETCH,
  heartbeat: config.RABBITMQ_HEARTBEAT,
};

module.exports = {
  databaseUrl,
  rabbitMQ,
};
