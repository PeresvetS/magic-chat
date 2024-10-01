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
  logger.info(`Updating lead ${lead.id} address to ${address}`);
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'address', address));
}

async function updateBusinessType(args) {
  const { lead, businessType } = args;
  logger.info(`Updating lead ${lead.id} business type to ${businessType}`);
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'businessType', businessType));
}

async function updateGenerationMethod(args) {
  const { lead, method } = args;
  logger.info(`Updating lead ${lead.id} generation method to ${method}`);
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'leadGenerationMethod', method));
}

async function updateMainPains(args) {
  const { lead, pains } = args;
  logger.info(`Updating lead ${lead.id} main pains to ${pains}`);
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'mainPains', pains));
}

async function updateLocation(args) {
  const { lead, location } = args;
  logger.info(`Updating lead ${lead.id} location to ${location}`);
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'location', location));
}

async function updateInterests(args) {
  const { lead, interests } = args;
  logger.info(`Updating lead ${lead.id} interests to ${interests}`);
  return safeStringify(await leadProfileService.updateLeadProfileField(lead.id, 'interests', interests));
}

const tools = [
  {
    name: "change_lead_status_positive",
    description: "Изменить статус лида на положительный, если клиент заинтересован в продукте или услуге.",
    function: changeLeadStatusPositive,
  },
  {
    name: "change_lead_status_negative",
    description: "Изменить статус лида на отрицательный, если клиент не заинтересован или отказался от дальнейшего общения.",
    function: changeLeadStatusNegative,
  },
  {
    name: "update_lead_address",
    description: "Обновить адрес лида. Передай полный адрес клиента в параметре 'address'.",
    function: updateAddress,
  },
  {
    name: "update_lead_business_type",
    description: "Обновить тип бизнеса лида. Передай сферу деятельности или тип бизнеса клиента в параметре 'businessType'.",
    function: updateBusinessType,
  },
  {
    name: "update_lead_generation_method",
    description: "Обновить метод генерации лида. Передай информацию о том, как клиент привлекает своих клиентов, в параметре 'method'.",
    function: updateGenerationMethod,
  },
  {
    name: "update_lead_main_pains",
    description: "Обновить основные проблемы лида. Передай основные боли или проблемы клиента в параметре 'pains'.",
    function: updateMainPains,
  },
  {
    name: "update_lead_location",
    description: "Обновить местоположение лида. Передай город или регион, где клиент ведет бизнес, в параметре 'location'.",
    function: updateLocation,
  },
  {
    name: "update_lead_interests",
    description: "Обновить интересы лида. Передай профессиональные интересы или хобби клиента в параметре 'interests'.",
    function: updateInterests,
  },
];

module.exports = tools;
