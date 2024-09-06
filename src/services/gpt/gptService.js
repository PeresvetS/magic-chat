// src/services/gpt/gptService.js

const axios = require('axios');
const OpenAI = require('openai');

const config = require('../../config');
const logger = require('../../utils/logger');
const LeadsService = require('../leads/src/LeadsService');
const bitrixService = require('../crm/src/bitrixService');
const notificationBot = require('../../bot/notification/notificationBot');
const { safeStringify } = require('../../utils/helpers');

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
      bitrixInfo = await bitrixService.getIntegrationInfo(campaign.userId);
      const url = `${bitrixInfo.bitrixInboundUrl}/crm.lead.update.json?ID=${lead.bitrixId}&FIELDS[STATUS_ID]=IN_PROCESS`;
      const response = await axios.get(url);
    }

    if (
      campaign &&
      campaign.notificationTelegramIds &&
      campaign.notificationTelegramIds.length > 0
    ) {
      // Получаем последние сообщения из массива messages
      const recentMessages = messages.slice(-6);

      const messageHistory =
        recentMessages.length > 0
          ? recentMessages
              .map(
                (msg) => `${msg.role === 'human' ? '👤' : '🤖'} ${msg.content}`,
              )
              .join('\n\n')
          : 'История сообщений недоступна';

      const message = `
Новый успешный лид!

👤 Имя: ${updatedLead.name || 'Не указано'}
📞 Телефон: ${updatedLead.phone}
🏷️ Источник: ${updatedLead.source || 'Не указан'}
📅 Дата создания: ${updatedLead.createdAt.toLocaleString()}
🔗 Кампания: ${campaign.name}
🆔 ID лида: ${updatedLead.id}
${updatedLead.bitrixId ? `🔢 Bitrix ID: ${updatedLead.bitrixId}` : ''}

💬 Последнее сообщение: ${lead.lastMessageTime ? `${lead.lastMessageTime.toLocaleString()} через ${lead.lastPlatform}` : 'Нет данных'}

📜 Последние сообщения диалога:
${messageHistory}
          `;

      try {
        for (const telegramId of campaign.notificationTelegramIds) {
          await notificationBot.sendNotification(telegramId, message);
        }
        logger.info(
          `Notifications sent to ${campaign.notificationTelegramIds.length} recipients for lead ${updatedLead.id}`,
        );
      } catch (error) {
        logger.error('Error sending notifications:', error);
      }
    } else {
      logger.warn(
        `No notification recipients found for campaign ${campaign.id}`,
      );
    }

    return updatedLead;
  } catch (error) {
    logger.error('Error changing lead to positive status:', error);
  }
}

const availableFunctions = {
  change_lead_status_negative: async (lead) => {
    logger.info(`Lead ${lead.id} status changed to PROCESSED_NEGATIVE`);
    return await LeadsService.updateLeadStatus(lead.id, 'PROCESSED_NEGATIVE');
  },
  change_lead_status_positive: async (lead, campaign, messages) => {
    logger.info(`Lead ${lead.id} status changed to PROCESSED_POSITIVE`);
    return await changeLeadStatusPositive(lead, campaign, messages);
  },
};

async function generateResponse(lead, messages, campaign) {
  try {
    let googleSheetData = null;

    logger.info(
      `Generating response for lead ${safeStringify(lead)} with messages: ${safeStringify(messages)} and campaign: ${safeStringify(campaign)}`,
    );

    if (campaign.googleSheetUrl) {
      googleSheetData = await getGoogleSheetData(campaign.googleSheetUrl);
    }

    const googleSheetPrompt = googleSheetData
      ? `Here's the current Q&A data: ${safeStringify(googleSheetData)}. Use this information to provide more accurate answers when possible. If a user's question closely matches a question in this data, prioritize using the corresponding answer, but feel free to expand or adapt it as necessary to fully address the user's query.`
      : '';

    const formattedMessages = [
      { role: 'system', content: campaign.prompt.content },
      { role: 'system', content: googleSheetPrompt },
      ...messages.map((msg) => ({
        role: msg.role === 'human' ? 'user' : 'assistant',
        content: msg.content,
      })),
    ];

    logger.info(
      `Sending request to OpenAI with messages: ${safeStringify(formattedMessages)}`,
    );

    const functions = [
      {
        name: 'change_lead_status_negative',
        description:
          'Change the status of the current lead to PROCESSED_NEGATIVE',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'change_lead_status_positive',
        description:
          'Change the status of the current lead to PROCESSED_POSITIVE and notify the user',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      functions,
      function_call: 'auto',
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;

      logger.info(`Function call: ${functionName}`);

      if (functionName in availableFunctions) {
        const functionResult = await availableFunctions[functionName](
          lead,
          campaign,
          messages,
        );

        formattedMessages.push({
          role: 'function',
          name: functionName,
          content: safeStringify(functionResult),
        });

        const secondResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: formattedMessages,
        });

        return secondResponse.choices[0].message.content;
      }
      return `Function ${functionName} not found.`;
    }

    return responseMessage.content;
  } catch (error) {
    logger.error('Error generating GPT response:', error);
    throw error;
  }
}

module.exports = { generateResponse };
