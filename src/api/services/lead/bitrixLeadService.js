// src/api/services/lead/bitrixLeadService.js

const { Bitrix } = require('@2bad/bitrix');

const logger = require('../../../utils/logger');

class BitrixLeadService {
  constructor(webhookUrl) {
    this.bitrix = Bitrix(webhookUrl);
  }

  async getStatusName(statusId) {
    try {
      const { result } = await this.bitrix.call('crm.status.list');
      const status = result.find((item) => item.STATUS_ID === statusId);
      return status ? status.NAME : statusId;
    } catch (error) {
      logger.error('Error fetching status name from Bitrix24', {
        statusId,
        error: error.message,
      });
      return statusId;
    }
  }

  async getLeadData(leadId) {
    try {
      const { result } = await this.bitrix.leads.get(leadId);

      logger.info(`Lead data: ${JSON.stringify(result)}`);

      if (!result) {
        logger.error('Failed to get lead data from Bitrix24', { leadId });
        return null;
      }

      const {
        ID,
        TITLE,
        NAME,
        SECOND_NAME,
        LAST_NAME,
        STATUS_ID,
        SOURCE_ID,
        PHONE,
        EMAIL,
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
        email: formattedEmail,
      };
    } catch (error) {
      logger.error('Error fetching lead data from Bitrix24', {
        leadId,
        error: error.message,
      });
      return null;
    }
  }

  async updateLead(leadId, fields) {
    try {
      const { result, time } = await this.bitrix.leads.update(leadId, fields);
      if (result) {
        logger.info(
          `Lead with ID ${leadId} successfully updated in ${time.duration} seconds`,
        );
        return true;
      }
      logger.error('Failed to update lead', { leadId });
      return false;
    } catch (error) {
      logger.error('Error updating lead in Bitrix24', {
        leadId,
        error: error.message,
      });
      return false;
    }
  }
}

module.exports = BitrixLeadService;
