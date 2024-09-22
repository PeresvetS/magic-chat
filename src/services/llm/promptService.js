// src/services/llm/promptService.js

const logger = require('../../utils/logger');
const { leadProfileService } = require('../leads');
const knowledgeBaseServiceFactory = require('./knowledgeBase/knowledgeBaseServiceFactory');
const { getGoogleSheetData, getCurrentTime } = require('./llmFunctions');

async function generatePrompt(lead, campaign, userMessage, memory) {
  try {
    const time = getCurrentTime();
    const googleSheetData = await getGoogleSheetData(campaign.googleSheetUrl);
    const leadProfileInfo = await leadProfileService.getLeadProfileInfo(lead.id);
    const { history, summary, vectorHistory } = await memory.loadMemoryVariables({
      input: userMessage,
    });

    let prompt = '';

    // Добавляем информацию о профиле лида
    if (leadProfileInfo) {
      prompt += `${leadProfileInfo}\n\n`;
    }

    // Добавляем сводку предыдущих разговоров
    if (summary) {
      prompt += `Summary of previous conversations:\n${summary}\n\n`;
    }

    // Добавляем недавнюю историю разговоров
    if (history.length > 0) {
      prompt += `Recent conversation:\n${history.map(m => `${m._getType()}: ${m.content}`).join('\n')}\n\n`;
    }

    // Добавляем релевантную информацию из векторного хранилища
    if (vectorHistory) {
      prompt += `Relevant information from previous conversations:\n${vectorHistory}\n\n`;
    }

    // Добавляем данные из Google Sheets
    if (googleSheetData) {
      prompt += `Relevant Q&A data:\n${googleSheetData}\n\n`;
    }

    // Добавляем текущее время
    prompt += `Current time: ${time}\n\n`;

    // Добавляем текущее сообщение пользователя
    prompt += `Human: ${userMessage}\nAI:`;

    // Добавляем информацию из базы знаний, если она есть
    if (campaign.knowledgeBaseId) {
      const knowledgeBaseService = knowledgeBaseServiceFactory.getInstanceForCampaign(campaign.id);
      const knowledgeBase = await knowledgeBaseService.getKnowledgeBaseByCampaignId();
      if (knowledgeBase) {
        const relevantKnowledge = await knowledgeBaseService.getRelevantKnowledge(knowledgeBase.id, userMessage);
        if (relevantKnowledge) {
          prompt += `\n\nRelevant knowledge:\n${relevantKnowledge}\n`;
        }
      }
    }

    return prompt;
  } catch (error) {
    logger.error(`Error generating prompt: ${error.message}`);
    return `Human: ${userMessage}\nAI:`;
  }
}

module.exports = {
  generatePrompt,
};

