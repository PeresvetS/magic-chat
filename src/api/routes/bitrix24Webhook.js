// src/api/routes/bitrix24Webhook.js

const router = express.Router();
const express = require('express');
const { saveLead } = require('../../db');
const logger = require('../../utils/logger');
const { checkBitrix24Token } = require('../middleware/checkApiTokens');
const Bitrix24LeadService = require('../services/lead/bitrix24LeadService');
const { safeJSONParse, parsePHPSerialized, safeStringify } = require('../../requestParsers');

// Middleware для парсинга различных форматов данных
router.use(express.json());
router.use(express.urlencoded({ extended: true }));


router.post('/webhook', checkBitrix24Token, async (req, res) => {
  try {
    let eventName = req.body.event;
    let data;

    if (typeof req.body.data === 'string') {
      data = safeJSONParse(req.body.data) || parsePHPSerialized(req.body.data);
    } else if (typeof req.body.data === 'object') {
      data = req.body.data;
    }

    if (!eventName || !data) {
      logger.warn('Invalid request structure', { body: safeStringify(req.body) });
      return res.status(400).json({ error: 'Invalid request structure' });
    }

    logger.info('Parsed Bitrix24 webhook data:', { eventName, data: safeStringify(data) });

    if (eventName !== 'ONCRMLEADADD') {
      logger.warn('Unsupported event type received', { eventName });
      return res.status(400).json({ error: 'Unsupported event type' });
    }

    const { ID } = data.FIELDS || {};

    if (!ID) {
      logger.error('Missing lead ID', { data: safeStringify(data) });
      return res.status(400).json({ error: 'Missing lead ID' });
    }

    const leadData = await Bitrix24LeadService.getLeadData(ID);

    if (!leadData) {
      return res.status(500).json({ error: 'Failed to fetch lead data from Bitrix24' });
    }

    const statusName = Bitrix24LeadService.getStatusName(leadData.status);

    if (statusName !== 'тест') {
      logger.warn('Lead status is not "тест"', { statusName });
      return res.status(400).json({ error: 'Lead status is not "тест"' });
    }

    logger.info('Extracted lead information', leadData);

    // Сохраняем информацию о лиде в базу данных
    const savedLead = await saveLead({
      bitrix_id: leadData.id,
      name: leadData.name,
      phone: leadData.phone,
      source: leadData.source,
      status: leadData.status
    });

    logger.info('New lead saved to database', { 
      leadId: savedLead.id, 
      bitrixId: leadData.id, 
      name: leadData.name, 
      phone: leadData.phone, 
      source: leadData.source,
      status: leadData.status
    });

    res.json({ 
      success: true, 
      message: 'Lead information received and saved to database', 
      leadId: savedLead.id 
    });

    logger.info('Successfully processed Bitrix24 webhook', { leadId: savedLead.id });
  } catch (error) {
    logger.error('Error processing Bitrix24 webhook', { 
      error: error.message, 
      stack: error.stack,
      body: safeStringify(req.body)
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;