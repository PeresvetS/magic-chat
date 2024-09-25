// src/services/llm/tools/llmTools.js

const { tool } = require('@langchain/core/tools');
const z = require('zod');
const axios = require('axios');
const logger = require('../../../utils/logger');
const { leadProfileService } = require('../../leads');
const bitrixService = require('../../crm/src/bitrixService');
const { sendNotification } = require('../../notification/notificationService');

const changeLeadStatusPositive = tool(
  async ({ lead, campaign, messages }) => {
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

      return JSON.stringify(updatedProfile);
    } catch (error) {
      logger.error('Error changing lead to positive status:', error);
      throw error;
    }
  },
  {
    name: "change_lead_status_positive",
    description: "Change the lead status to positive",
    schema: z.object({
      lead: z.object({
        id: z.string(),
        bitrixId: z.string().optional(),
      }),
      campaign: z.object({
        id: z.string(),
        userId: z.string(),
        notificationTelegramIds: z.array(z.string()).optional(),
      }),
      messages: z.array(z.object({
        content: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
      })).describe("Array of messages related to the lead"),
    }),
  }
);

const changeLeadStatusNegative = tool(
  async ({ lead }) => {
    try {
      const updatedProfile = await leadProfileService.updateLeadProfileField(lead.id, 'status', 'PROCESSED_NEGATIVE');
      logger.info(`Lead ${lead.id} status changed to PROCESSED_NEGATIVE`);
      return JSON.stringify(updatedProfile);
    } catch (error) {
      logger.error('Error changing lead to negative status:', error);
      throw error;
    }
  },
  {
    name: "change_lead_status_negative",
    description: "Change the lead status to negative",
    schema: z.object({
      lead: z.object({
        id: z.string(),
      }),
    }),
  }
);

const updateAddress = tool(
  async ({ lead, address }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, 'address', address));
  },
  {
    name: "update_lead_address",
    description: "Update the lead's address",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      address: z.string(),
    }),
  }
);

const updateBusinessType = tool(
  async ({ lead, businessType }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, 'businessType', businessType));
  },
  {
    name: "update_lead_business_type",
    description: "Update the lead's business type",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      businessType: z.string(),
    }),
  }
);

const updateGenerationMethod = tool(
  async ({ lead, method }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, 'leadGenerationMethod', method));
  },
  {
    name: "update_lead_generation_method",
    description: "Update the lead's generation method",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      method: z.string(),
    }),
  }
);

const updateMainPains = tool(
  async ({ lead, pains }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, 'mainPains', pains));
  },
  {
    name: "update_lead_main_pains",
    description: "Update the lead's main pains",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      pains: z.string(),
    }),
  }
);

const updateLocation = tool(
  async ({ lead, location }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, 'location', location));
  },
  {
    name: "update_lead_location",
    description: "Update the lead's location",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      location: z.string(),
    }),
  }
);

const updateInterests = tool(
  async ({ lead, interests }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, 'interests', interests));
  },
  {
    name: "update_lead_interests",
    description: "Update the lead's interests",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      interests: z.string(),
    }),
  }
);

const updateField = tool(
  async ({ lead, fieldName, value }) => {
    return JSON.stringify(await leadProfileService.updateLeadProfileField(lead.id, fieldName, value));
  },
  {
    name: "update_lead_field",
    description: "Update a specific field of the lead's profile",
    schema: z.object({
      lead: z.object({ id: z.string() }),
      fieldName: z.string().describe("The name of the field to update"),
      value: z.any().describe("The new value for the field"),
    }),
  }
);

module.exports = {
  changeLeadStatusPositive,
  changeLeadStatusNegative,
  updateAddress,
  updateBusinessType,
  updateGenerationMethod,
  updateMainPains,
  updateLocation,
  updateInterests,
  updateField,
};
