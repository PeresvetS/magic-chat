// src/api/routes/webhooks.js

const express = require('express');

const logger = require('../../utils/logger');
const { safeStringify } = require('../../utils/helpers');
const { checkBitrixToken } = require('../middleware/checkApiTokens');
const {
  processBitrixWebhook,
} = require('../services/webhook/bitrixWebhookService');
const { handleMessageService } = require('../../services/messaging');

const router = express.Router();

// В файле src/api/routes/webhooks.js
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    const { body } = req;
    // Проверка подписи webhook, если это необходимо
    
    if (body.type === 'message') {
      await handleMessageService.processIncomingMessage(
        body.from,
        body.body,
        'whatsapp'
      );
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

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
