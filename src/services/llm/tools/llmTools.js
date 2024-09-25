// src/services/llm/tools/llmTools.js

const axios = require('axios');
const logger = require('../../../utils/logger');
const { leadProfileService } = require('../../leads');
const bitrixService = require('../../crm/src/bitrixService');
const { sendNotification } = require('../../notification/notificationService');
const { safeStringify } = require('../../../utils/helpers');

async function changeLeadStatusPositive(args) {
  const { lead, campaign, messages } = args;
  try {
    const updatedProfile = await leadProfileService.updateLeadProfileField(lead.id, 'status', 'PROCESSED_POSITIVE');
    logger.info(`Lead ${lead.id} status changed to PROCESSED_POSITIVE`);

    lead.bitrixId = lead.bitrixId || null;
    
    if (lead.bitrixId && campaign) {
      const bitrixInfo = await bitrixService.getIntegrationInfo(campaign.userId);
      const url = `${bitrixInfo.bitrixInboundUrl}/crm.lead.update.json?ID=${lead.bitrixId}&FIELDS[STATUS_ID]=IN_PROCESS`;
      await axios.get(url);
    }

    if (campaign && campaign.notificationTelegramIds && campaign.notificationTelegramIds.length > 0) {
      await sendNotification(updatedProfile, campaign, lead.id, messages);
    } else {
      logger.warn(`No notification recipients found for campaign ${campaign.id}`);
    }

    return safeStringify(updatedProfile);
  } catch (error) {
    logger.error('Error changing lead to positive status:', error);
    throw error;
  }
}

async function changeLeadStatusNegative(args) {
  const { lead } = args;
  try {
    const updatedProfile = await leadProfileService.updateLeadProfileField(lead.id, 'status', 'PROCESSED_NEGATIVE');
    logger.info(`Lead ${lead.id} status changed to PROCESSED_NEGATIVE`);
    return safeStringify(updatedProfile);
  } catch (error) {
    logger.error('Error changing lead to negative status:', error);
    throw error;
  }
}

async function updateAddress(args) {
  const { lead, address } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'address', address));
}

async function updateBusinessType(args) {
  const { lead, businessType } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'businessType', businessType));
}

async function updateGenerationMethod(args) {
  const { lead, method } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'leadGenerationMethod', method));
}

async function updateMainPains(args) {
  const { lead, pains } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'mainPains', pains));
}

async function updateLocation(args) {
  const { lead, location } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'location', location));
}

async function updateInterests(args) {
  const { lead, interests } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'interests', interests));
}

async function updateField(args) {
  const { lead, fieldName, value } = args;
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, fieldName, value));
}

const tools = [
  {
    name: "change_lead_status_positive",
    description: "Change the lead status to positive",
    function: changeLeadStatusPositive,
  },
  {
    name: "change_lead_status_negative",
    description: "Change the lead status to negative",
    function: changeLeadStatusNegative,
  },
  {
    name: "update_lead_address",
    description: "Update the lead's address",
    function: updateAddress,
  },
  {
    name: "update_lead_business_type",
    description: "Update the lead's business type",
    function: updateBusinessType,
  },
  {
    name: "update_lead_generation_method",
    description: "Update the lead's generation method",
    function: updateGenerationMethod,
  },
  {
    name: "update_lead_main_pains",
    description: "Update the lead's main pains",
    function: updateMainPains,
  },
  {
    name: "update_lead_location",
    description: "Update the lead's location",
    function: updateLocation,
  },
  {
    name: "update_lead_interests",
    description: "Update the lead's interests",
    function: updateInterests,
  },
  {
    name: "update_lead_field",
    description: "Update a specific field of the lead's profile",
    function: updateField,
  },
];

module.exports = tools;
