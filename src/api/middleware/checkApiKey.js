// src/api/middleware/checkApiKey.js

const config = require('../../config');
const logger = require('../../utils/logger');

const checkApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  if (apiKey !== config.API_KEY) {
    logger.warn('Попытка доступа с неверным API ключом', { apiKey });
    return res.status(401).json({ error: 'Неверный API ключ' });
  }
  next();
};

module.exports = { checkApiKey };