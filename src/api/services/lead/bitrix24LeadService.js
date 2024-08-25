// src/services/bitrix24LeadService.js

const { Bitrix } = require('@2bad/bitrix');
const config = require('../../../config');
const logger = require('../../../utils/logger');

// Инициализация клиента Bitrix24

const bitrix = Bitrix(config.BITRIX24_INBOUND_WEBHOOK_URL);

class Bitrix24LeadService {

  async getStatusName(statusId) {
    try {
      const { result } = await bitrix.call('crm.status.list');
      const status = result.find(item => item.STATUS_ID === statusId);
      return status ? status.NAME : statusId;
    } catch (error) {
      logger.error('Error fetching status name from Bitrix24', { statusId, error: error.message });
      return statusId;
    }
  }
  async getLeadData(leadId) {
    
    try {
      const { result } = await bitrix.leads.get(leadId);
    
      logger.info(`Lead data: ${JSON.stringify(result)}`);

      if (!result) {
        logger.error('Failed to get lead data from Bitrix24', { leadId });
        return null;
      }

      // Извлекаем нужные нам поля
      const { 
        ID, 
        TITLE, 
        NAME, 
        SECOND_NAME, 
        LAST_NAME, 
        STATUS_ID, 
        SOURCE_ID, 
        PHONE, 
        EMAIL 
      } = result;

      // Форматируем телефон и email
      const formattedPhone = PHONE && PHONE.length > 0 ? PHONE[0].VALUE : null;
      const formattedEmail = EMAIL && EMAIL.length > 0 ? EMAIL[0].VALUE : null;

      return {
        id: ID,
        title: TITLE,
        name: `${NAME || ''} ${SECOND_NAME || ''} ${LAST_NAME || ''}`.trim(),
        status: STATUS_ID,
        source: SOURCE_ID,
        phone: formattedPhone,
        email: formattedEmail
      };
    } catch (error) {
      logger.error('Error fetching lead data from Bitrix24', { leadId, error: error.message });
      return null;
    }
  }

  async updateLead(leadId, fields) {
    try {
      const { result, time } = await bitrix.leads.update(leadId, fields);
      if (result) {
        logger.info(`Lead with ID ${leadId} successfully updated in ${time.duration} seconds`);
        return true;
      } else {
        logger.error('Failed to update lead', { leadId });
        return false;
      }
    } catch (error) {
      logger.error('Error updating lead in Bitrix24', { leadId, error: error.message });
      return false;
    }
  }
}

module.exports = new Bitrix24LeadService();