// src/middleware/requestLogger.js

const logger = require('../../utils/logger');

function requestLogger(req, res, next) {
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    body: req.body,
    headers: req.headers,
  });
  next();
}

module.exports = requestLogger;
