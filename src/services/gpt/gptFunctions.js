// src/services/gpt/gptFunctions.js

const axios = require('axios');
const logger = require('../../utils/logger');
const LeadsService = require('../leads/src/LeadsService');
const bitrixService = require('../crm/src/bitrixService');
const { sendNotification } = require('../notification/notificationService');

async function getGoogleSheetData(googleSheetUrl) {
    let sheetId;
    if (googleSheetUrl.includes('spreadsheets/d/')) {
      sheetId = googleSheetUrl.split('spreadsheets/d/')[1].split('/')[0];
    } else {
      sheetId = googleSheetUrl;
    }
  
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
  
    try {
      const response = await axios.get(url);
      const rows = response.data.split('\n').map((row) => row.split(','));
      const headers = rows[0];
      return rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = row[index].trim();
        });
        return obj;
      });
    } catch (error) {
      logger.error('Error fetching Google Sheet:', error);
      throw new Error('Failed to fetch Google Sheet data');
    }
  }
  
async function changeLeadStatusPositive(lead, campaign, messages) {
    try {
      const updatedLead = await LeadsService.updateLeadStatus(
        lead.id,
        'PROCESSED_POSITIVE',
      );
      logger.info(
        `Lead ${updatedLead.id} ${updatedLead.name} status changed to PROCESSED_POSITIVE`,
      );
  
      lead.bitrixId = lead.bitrixId || null;
  
      if (lead.bitrixId != null && campaign) {
        const bitrixInfo = await bitrixService.getIntegrationInfo(campaign.userId);
        const url = `${bitrixInfo.bitrixInboundUrl}/crm.lead.update.json?ID=${lead.bitrixId}&FIELDS[STATUS_ID]=IN_PROCESS`;
        await axios.get(url);
      }
  
      if (
        campaign &&
        campaign.notificationTelegramIds &&
        campaign.notificationTelegramIds.length > 0
      ) {
        await sendNotification(updatedLead, campaign, lead, messages);
      } else {
        logger.warn(
          `No notification recipients found for campaign ${campaign.id}`,
        );
      }
  
      return updatedLead;
    } catch (error) {
      logger.error('Error changing lead to positive status:', error);
      throw error;
    }
  }

  async function changeLeadStatusNegative(lead, campaign, messages) {
    try {
      const updatedLead = await LeadsService.updateLeadStatus(
        lead.id,
        'PROCESSED_NEGATIVE',
      );
      logger.info(
        `Lead ${updatedLead.id} ${updatedLead.name} status changed to PROCESSED_NEGATIVE`,
      );
      return updatedLead;
    } catch (error) {
      logger.error('Error changing lead to negative status:', error);
      throw error;
    }
  }

  module.exports = {
    getGoogleSheetData,
    changeLeadStatusPositive,
    changeLeadStatusNegative,
  };