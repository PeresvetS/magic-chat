// src/services/gpt/gptFunctions.js

const axios = require('axios');

const logger = require('../../utils/logger');
const { leadProfileService } = require('../leads');
const bitrixService = require('../crm/src/bitrixService');
const { sendNotification } = require('../notification/notificationService');

async function getGoogleSheetData(googleSheetUrl) {
  if (!googleSheetUrl || googleSheetUrl === '') {
    return '';
  }
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
      const googleSheetData = obj ? `Here's the current Q&A data: ${safeStringify(googleSheetData)}. Use this information to provide more accurate answers when possible. If a user's question closely matches a question in this data, prioritize using the corresponding answer, but feel free to expand or adapt it as necessary to fully address the user's query.`
      : '';
      return googleSheetData;
    });
  } catch (error) {
    logger.error('Error fetching Google Sheet:', error);
    throw new Error('Failed to fetch Google Sheet data');
  }
}

function getCurrentTime() {
  return new Date().toLocaleString();
}

async function changeLeadStatusPositive(lead, campaign, messages) {
  try {
    const updatedProfile = await updateLeadProfileField(lead.id, 'status', 'PROCESSED_POSITIVE');
    logger.info(`Lead ${lead.id} status changed to PROCESSED_POSITIVE`);

    lead.bitrixId = lead.bitrixId || null;

    if (lead.bitrixId != null && campaign) {
      const bitrixInfo = await bitrixService.getIntegrationInfo(
        campaign.userId,
      );
      const url = `${bitrixInfo.bitrixInboundUrl}/crm.lead.update.json?ID=${lead.bitrixId}&FIELDS[STATUS_ID]=IN_PROCESS`;
      await axios.get(url);
    }

    if (
      campaign &&
      campaign.notificationTelegramIds &&
      campaign.notificationTelegramIds.length > 0
    ) {
      await sendNotification(updatedProfile, campaign, leadId, messages);
    } else {
      logger.warn(
        `No notification recipients found for campaign ${campaign.id}`,
      );
    }

    return updatedProfile;
  } catch (error) {
    logger.error('Error changing lead to positive status:', error);
    throw error;
  }
}

async function changeLeadStatusNegative(lead) {
  try {
    const updatedProfile = await updateLeadProfileField(lead.id, 'status', 'PROCESSED_NEGATIVE');
    logger.info(`Lead ${lead.id} status changed to PROCESSED_NEGATIVE`);
    return updatedProfile;
  } catch (error) {
    logger.error('Error changing lead to negative status:', error);
    throw error;
  }
}

async function updateLeadName(lead, name) {
  return await updateLeadProfileField(lead.id, 'name', name);
}

async function updateLeadAddress(lead, address) {
  return await updateLeadProfileField(lead.id, 'address', address);
}

async function updateLeadBusinessType(lead, businessType) {
  return await updateLeadProfileField(lead.id, 'businessType', businessType);
}

async function updateLeadGenerationMethod(lead, method) {
  return await updateLeadProfileField(lead.id, 'leadGenerationMethod', method);
}

async function updateLeadMainPains(lead, pains) {
  return await updateLeadProfileField(lead.id, 'mainPains', pains);
}

async function updateLeadLocation(lead, location) {
  return await updateLeadProfileField(lead.id, 'location', location);
}

async function updateLeadInterests(lead, interests) {
  return await updateLeadProfileField(lead.id, 'interests', interests);
}

async function updateLeadProfileField(leadId, field, value) {
  try {
    return await leadProfileService.updateLeadProfileField(leadId, field, value);
  } catch (error) {
    logger.error(`Error updating lead profile field ${field}:`, error);
    throw error;
  }
}



module.exports = {
  getGoogleSheetData,
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  updateLeadName,
  updateLeadAddress,
  updateLeadBusinessType,
  updateLeadGenerationMethod,
  updateLeadMainPains,
  updateLeadLocation,
  updateLeadInterests,
  getCurrentTime,
};
