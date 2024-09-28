// src/api/routes/webhooks.js

const express = require('express');

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const { checkBitrixToken } = require('../middlewares/checkApiTokens');
const {
  processBitrixWebhook,
} = require('../services/webhook/bitrixWebhookService');

const router = express.Router();

router.post('/bitrix', checkBitrixToken, async (req, res) => {
  try {
    await processBitrixWebhook(req.parsedBody, req.user);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing Bitrix webhook', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// router.post('/amocrm', checkAmoCrmToken, async (req, res) => {
//   try {
//     await processAmoCrmWebhook(req.body, req.user);
//     res.json({ success: true });
//   } catch (error) {
//     logger.error('Error processing AmoCRM webhook', { error: error.message });
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/', (req, res) => {
  res.json({ message: 'Webhook API is running' });
});

module.exports = router;
