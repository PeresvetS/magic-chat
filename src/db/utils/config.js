// src/db/utils/config.js

const config = require('../../config');

const rabbitMQ = {
  url: config.RABBITMQ_URL,
  queue: config.RABBITMQ_QUEUE,
  mailingQueue: config.RABBITMQ_MAILING_QUEUE || 'mailing',
  messagingQueue: config.RABBITMQ_MESSAGING_QUEUE || 'messaging',
  prefetch: config.RABBITMQ_PREFETCH,
  heartbeat: config.RABBITMQ_HEARTBEAT,
};

module.exports = {
  rabbitMQ,
};
