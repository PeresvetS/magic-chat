// src/api/services/webhook/bitrixWebhookService.js

const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');
const BitrixLeadService = require('../lead/bitrixLeadService');
const LeadsService = require('../../../services/leads/src/LeadsService');
const messageDistributionService = require('../../../services/mailing/services/messageDistributionService');

async function processBitrixWebhook(data, user) {
  try {
    logger.info('Processing Bitrix webhook', { data: safeStringify(data) });

    const eventName = data.event;
    const leadId = data['data[FIELDS][ID]'];

    if (!eventName || !leadId) {
      logger.warn('Invalid request structure', { body: safeStringify(data) });
      throw new Error('Invalid request structure');
    }

    logger.info('Parsed Bitrix24 webhook data:', { eventName, leadId });

    if (eventName !== 'ONCRMLEADADD' && eventName !== 'ONCRMLEADUPDATE') {
      logger.warn('Unsupported event type received', { eventName });
      throw new Error('Unsupported event type');
    }

    const bitrixLeadService = new BitrixLeadService(
      user.bitrixIntegration.bitrixInboundUrl,
    );
    const leadData = await bitrixLeadService.getLeadData(leadId);

    if (!leadData) {
      throw new Error('Failed to fetch lead data from Bitrix24');
    }

    const statusName = await bitrixLeadService.getStatusName(leadData.status);

    logger.info('Extracted lead information', leadData);

    // Сохраняем информацию о лиде в базу данных
    const savedLead = await LeadsService.addLeadToCRM(user.id, {
      bitrix_id: leadData.id,
      name: leadData.name || '',
      phone: leadData.phone || '',
      source: leadData.source || '',
      status: leadData.status,
    });

    logger.info('Lead saved to database', {
      leadId: savedLead.id,
      bitrixId: leadData.id,
      name: leadData.name || '',
      phone: leadData.phone || '',
      source: leadData.source || '',
      status: leadData.status,
      userId: user.id,
    });

    logger.info('Successfully processed Bitrix24 webhook', {
      leadId: savedLead.id,
    });

    if (statusName === 'тест') {
      await messageDistributionService.sendMessageToLead(savedLead, user);
    } else {
      logger.info('Lead status is not "тест", skipping message sending', {
        statusName,
      });
    }
  } catch (error) {
    logger.error('Error processing Bitrix24 webhook', {
      error: error.message,
      stack: error.stack,
      body: safeStringify(data),
    });
    throw error;
  }
}

module.exports = { processBitrixWebhook };
