// src/api/routes/webhooks.js

const express = require('express');
const { processBitrixWebhook } = require('../services/webhook/bitrixWebhookService');
const { processAmoCrmWebhook } = require('../services/webhook/amoCrmWebhookService');
const { checkBitrixToken, checkAmoCrmToken } = require('../middleware/checkApiTokens');
const logger = require('../../utils/logger');

const router = express.Router();

router.post('/bitrix/:webhookId', checkBitrixToken, async (req, res) => {
  try {
    await processBitrixWebhook(req.body, req.user);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing Bitrix webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/amocrm/:webhookId', checkAmoCrmToken, async (req, res) => {
  try {
    await processAmoCrmWebhook(req.body, req.user);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing AmoCRM webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;