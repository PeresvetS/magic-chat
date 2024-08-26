// src/api/services/webhook/bitrixWebhookService.js

const { leadsRepo } = require('../../../db/repositories/leadsRepo');
const logger = require('../../../utils/logger');
const BitrixLeadService = require('../lead/bitrixLeadService');
const { safeJSONParse, parsePHPSerialized, safeStringify } = require('../../../utils/helpers');
const { sendMessageToLead } = require('../../../services/mailing').distributionService;

async function processBitrixWebhook(data, user) {
  try {
    let eventName = data.event;
    let eventData;

    if (typeof data.data === 'string') {
      eventData = safeJSONParse(data.data) || parsePHPSerialized(data.data);
    } else if (typeof data.data === 'object') {
      eventData = data.data;
    }

    if (!eventName || !eventData) {
      logger.warn('Invalid request structure', { body: safeStringify(data) });
      throw new Error('Invalid request structure');
    }

    logger.info('Parsed Bitrix24 webhook data:', { eventName, data: safeStringify(eventData) });

    if (eventName !== 'ONCRMLEADADD') {
      logger.warn('Unsupported event type received', { eventName });
      throw new Error('Unsupported event type');
    }

    const { ID } = eventData.FIELDS || {};

    if (!ID) {
      logger.error('Missing lead ID', { data: safeStringify(eventData) });
      throw new Error('Missing lead ID');
    }

    const bitrixLeadService = new BitrixLeadService(user.bitrixIntegration.bitrixInboundUrl);
    const leadData = await bitrixLeadService.getLeadData(ID);

    if (!leadData) {
      throw new Error('Failed to fetch lead data from Bitrix24');
    }

    const statusName = await bitrixLeadService.getStatusName(leadData.status);

    if (statusName !== 'тест') {
      logger.warn('Lead status is not "тест"', { statusName });
      throw new Error('Lead status is not "тест"');
    }

    logger.info('Extracted lead information', leadData);

    // Сохраняем информацию о лиде в базу данных
    const savedLead = await leadsRepo.saveLead({
      bitrix_id: leadData.id,
      name: leadData.name,
      phone: leadData.phone,
      source: leadData.source,
      status: leadData.status,
      userId: user.id
    });

    logger.info('New lead saved to database', { 
      leadId: savedLead.id, 
      bitrixId: leadData.id, 
      name: leadData.name, 
      phone: leadData.phone, 
      source: leadData.source,
      status: leadData.status,
      userId: user.id
    });

    logger.info('Successfully processed Bitrix24 webhook', { leadId: savedLead.id });

    await sendMessageToLead(savedLead, user);

  } catch (error) {
    logger.error('Error processing Bitrix24 webhook', { 
      error: error.message, 
      stack: error.stack,
      body: safeStringify(data)
    });
    throw error;
  }
}

module.exports = { processBitrixWebhook };