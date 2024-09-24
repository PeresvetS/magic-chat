// src/db/utils/config.js

const config = require('../../config');

const databaseUrl = config.SUPABASE_URL;

const rabbitMQ = {
  url: config.RABBITMQ_URL,
  queue: config.RABBITMQ_QUEUE,
  incomingQueue: config.RABBITMQ_INCOMING_QUEUE || 'incoming_messages',
  outgoingQueue: config.RABBITMQ_OUTGOING_QUEUE || 'outgoing_messages',
  prefetch: config.RABBITMQ_PREFETCH,
  heartbeat: config.RABBITMQ_HEARTBEAT,
};

module.exports = {
  databaseUrl,
  rabbitMQ,
};
