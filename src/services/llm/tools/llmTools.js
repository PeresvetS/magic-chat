// src/services/llm/tools/llmTools.js

const { tool } = require('@langchain/core/tools');
const z = require('zod');
const axios = require('axios');
const logger = require('../../../utils/logger');
const { leadProfileService } = require('../../leads');
const bitrixService = require('../../crm/src/bitrixService');
const { sendNotification } = require('../../notification/notificationService');
const { safeStringify } = require('../../../utils/helpers');

const getGoogleSheetDataTool = tool(
  async ({ googleSheetUrl }) => {
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
      const data = rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = row[index].trim();
        });
        return obj;
      });
      return `Here's the current Q&A data: ${safeStringify(data)}. Use this information to provide more accurate answers when possible. If a user's question closely matches a question in this data, prioritize using the corresponding answer, but feel free to expand or adapt it as necessary to fully address the user's query.`;
    } catch (error) {
      logger.error('Error fetching Google Sheet:', error);
      throw new Error('Failed to fetch Google Sheet data');
    }
  },
  {
    name: "get_google_sheet_data",
    description: "Fetch and process data from a Google Sheet",
    schema: z.object({
      googleSheetUrl: z.string().describe("The URL of the Google Sheet to fetch data from"),
    }),
  }
);

const getCurrentTimeTool = tool(
  () => {
    return new Date().toLocaleString();
  },
  {
    name: "get_current_time",
    description: "Get the current time",
    schema: z.object({}),
  }
);

const changeLeadStatusPositiveTool = tool(
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
      messages: z.array(z.any()),
    }),
  }
);

const changeLeadStatusNegativeTool = tool(
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

const updateLeadAddressTool = tool(
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

const updateLeadBusinessTypeTool = tool(
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

const updateLeadGenerationMethodTool = tool(
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

const updateLeadMainPainsTool = tool(
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

const updateLeadLocationTool = tool(
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

const updateLeadInterestsTool = tool(
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

const updateLeadFieldTool = tool(
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
  getGoogleSheetDataTool,
  getCurrentTimeTool,
  changeLeadStatusPositiveTool,
  changeLeadStatusNegativeTool,
  updateLeadAddressTool,
  updateLeadBusinessTypeTool,
  updateLeadGenerationMethodTool,
  updateLeadMainPainsTool,
  updateLeadLocationTool,
  updateLeadInterestsTool,
  updateLeadFieldTool,
};
