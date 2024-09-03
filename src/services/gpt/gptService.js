// src/services/gpt/gptService.js

const axios = require('axios');
const OpenAI = require("openai");
const config = require('../../config');
const logger = require('../../utils/logger');
const LeadsService = require('../leads/src/LeadsService');
const userRepo = require('../../db/repositories/userRepo');
const bitrixService = require('../crm/src/bitrixService');
const notificationBot = require('../../bot/notification/notificationBot');
const campaignService = require('../campaign/src/campaignsMailingService');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

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
    const rows = response.data.split('\n').map(row => row.split(','));
    const headers = rows[0];
    return rows.slice(1).map(row => {
      let obj = {};
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

async function getConversationContext(leadId) {
  try {
    const lead = await LeadsService.getLead(leadId);
    if (!lead) throw new Error('Lead not found');

    const user = await userRepo.getUserById(lead.userId);
    const bitrixInfo = await bitrixService.getIntegrationInfo(user.id);
    const campaign = await campaignService.getCampaignById(lead.campaignId);
  } catch (error) {
    logger.error('Error getting conversation context:', error);
  }
  return { lead, user, bitrixInfo, campaign };
}


async function changeLeadStatusPositive(context, messages) { 
  try {
    const updatedLead = await LeadsService.updateLeadStatus(context.lead.id, 'PROCESSED_POSITIVE');
        
        if (context.campaign && context.campaign.notificationTelegramIds && context.campaign.notificationTelegramIds.length > 0) {
          // Получаем последние сообщения из массива messages
          const recentMessages = messages.slice(-6);
          
          const messageHistory = recentMessages.length > 0 
            ? recentMessages.map(msg => `${msg.role === 'human' ? '👤' : '🤖'} ${msg.content}`).join('\n\n')
            : 'История сообщений недоступна';

          const message = `
Новый успешный лид!

👤 Имя: ${updatedLead.name || 'Не указано'}
📞 Телефон: ${updatedLead.phone}
🏷️ Источник: ${updatedLead.source || 'Не указан'}
📅 Дата создания: ${updatedLead.createdAt.toLocaleString()}
🔗 Кампания: ${context.campaign.name}
🆔 ID лида: ${updatedLead.id}
${updatedLead.bitrixId ? `🔢 Bitrix ID: ${updatedLead.bitrixId}` : ''}

💬 Последнее сообщение: ${context.lead.lastMessageTime ? `${context.lead.lastMessageTime.toLocaleString()} через ${context.lead.lastPlatform}` : 'Нет данных'}

📜 Последние сообщения диалога:
${messageHistory}
          `;

          try {
            for (const telegramId of context.campaign.notificationTelegramIds) {
              await notificationBot.sendMessage(telegramId, message);
            }
            logger.info(`Notifications sent to ${context.campaign.notificationTelegramIds.length} recipients for lead ${updatedLead.id}`);
          } catch (error) {
            logger.error('Error sending notifications:', error);
          }
        } else {
          logger.warn(`No notification recipients found for campaign ${context.campaign.id}`);
        }

        return updatedLead;
  } catch (error) {
    logger.error('Error changing lead to positive status:', error);
  }
}

const availableFunctions = {
  change_lead_status_negative: async (context) => {
    return await LeadsService.updateLeadStatus(context.lead.id, 'PROCESSED_NEGATIVE');
  },
  change_lead_status_positive: async (context, messages) => {
   return await changeLeadStatusPositive(context, messages);
  },
  update_bitrix_lead: async (context) => {
    const url = `${context.bitrixInfo.bitrixInboundUrl}/crm.lead.update.json?ID=${context.lead.bitrixId}&FIELDS[STATUS_ID]=IN_PROCESS`;
    const response = await axios.get(url);
    return response.data;
  },
  send_lead_to_amo: async (context) => {
    // This function is not implemented yet
    throw new Error('Function not implemented');
  },
};

async function generateResponse(leadId, messages, mainSystemPrompt) {
  try {

    const context = await getConversationContext(leadId);
    let googleSheetData = null;

    if (context.campaign && context.campaign.googleSheetUrl) {
      googleSheetData = await getGoogleSheetData(context.campaign.googleSheetUrl);
    }

    const googleSheetPrompt = googleSheetData 
      ? `Here's the current Q&A data: ${JSON.stringify(googleSheetData)}. Use this information to provide more accurate answers when possible. If a user's question closely matches a question in this data, prioritize using the corresponding answer, but feel free to expand or adapt it as necessary to fully address the user's query.`
      : '';

    const formattedMessages = [
      { role: "system", content: mainSystemPrompt },
      { role: "system", content: googleSheetPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'human' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    logger.info(`Sending request to OpenAI with messages: ${JSON.stringify(formattedMessages)}`);

    const functions = [
      {
        name: "change_lead_status_negative",
        description: "Change the status of the current lead to PROCESSED_NEGATIVE",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "change_lead_status_positive",
        description: "Change the status of the current lead to PROCESSED_POSITIVE and notify the user",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "update_bitrix_lead",
        description: "Update the status of the current lead in Bitrix24",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "send_lead_to_amo",
        description: "Send the current lead to AmoCRM (Not implemented yet)",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: formattedMessages,
      functions: functions,
      function_call: "auto",
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;

      logger.info(`Function call: ${functionName}`);

      if (functionName in availableFunctions) {

        const functionResult = await availableFunctions[functionName](context, messages);
        
        formattedMessages.push({
          role: "function",
          name: functionName,
          content: JSON.stringify(functionResult),
        });

        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: formattedMessages,
        });

        return secondResponse.choices[0].message.content;
      } else {
        return `Function ${functionName} not found.`;
      }
    }

    return responseMessage.content;
  } catch (error) {
    logger.error('Error generating GPT response:', error);
    throw error;
  }
}

module.exports = { generateResponse };