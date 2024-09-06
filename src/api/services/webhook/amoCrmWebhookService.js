// src/api/services/webhook/amoCrmWebhookService.js

const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');
const LeadsService = require('../../../services/leads/src/LeadsService');

async function processAmoCrmWebhook(data, user) {
  try {
    logger.info('Received AmoCRM webhook data:', { 
      userId: user.id, 
      data: safeStringify(data) 
    });

    const leadData = {
      amoCrm_id: data.id,
      name: data.name || '',
      phone: data.phone || '',
      source: data.source || '',
      status: data.status || 'NEW'
    };

    const savedLead = await LeadsService.addLeadToCRM(user.id, leadData);

    logger.info('Successfully processed AmoCRM webhook', { userId: user.id, leadId: savedLead.id });
  } catch (error) {
    logger.error('Error processing AmoCRM webhook', { 
      error: error.message, 
      stack: error.stack,
      userId: user.id,
      body: safeStringify(data)
    });
    throw error;
  }
}

module.exports = { processAmoCrmWebhook };