// src/services/llm/prompts/promptService.js

const logger = require('../../../utils/logger');
const { leadProfileService } = require('../../leads');
const knowledgeBaseServiceFactory = require('../knowledgeBase/knowledgeBaseServiceFactory');
const { getCurrentTime } = require('../utils/getTime');
const { safeStringify } = require('../../../utils/helpers');

async function generateMessages(lead, campaign, userMessage, memory) {
  try {
    const time = getCurrentTime();
    const leadProfileInfo = await leadProfileService.getLeadProfileInfo(lead.id);
    const { history, summary, vectorHistory } = await memory.loadMemoryVariables({
      input: userMessage,
    });

    const messages = [
      {
        role: 'system',
        content: `${campaign.prompt.content}\n\nДели свой ответ на части по абзацам, как обычно делят люди текст, когда пишут в мессенджерах. Делай это по-умному, смысловыми недлинными блоками. Отвечай всегда на русском языке.`
      }
    ];

    if (leadProfileInfo) {
      messages.push({
        role: 'system',
        content: `Информация о пользователе:\n${leadProfileInfo}`
      });
    }

    // Добавляем сводку предыдущих разговоров
    if (summary) {
      messages.push({
        role: 'system',
        content: `Сводка предыдущих разговоров:\n${summary}`
      });
    }

    // // Добавляем релевантную информацию из векторного хранилища
    // if (vectorHistory.length > 0) {
    //   const vectorHistoryString = vectorHistory.map(item => `${item.timestamp}: ${item.content}`).join('\n');
    //   messages.push({ role: 'system', content: `Relevant information from previous conversations: ${vectorHistoryString}` });
    // }

    // Добавляем текущее время
    messages.push({
      role: 'system',
      content: `Текущее время: ${time}`
    });

    // Добавляем информацию из базы знаний, если она есть
    const knowledgeBaseService = knowledgeBaseServiceFactory.getInstanceForCampaign(campaign.id);
    const knowledgeBase = await knowledgeBaseService.getKnowledgeBaseByCampaignId();
    if (knowledgeBase) {
      logger.info(`Getting relevant knowledge for campaign ${campaign.id}`);
      const relevantKnowledge = await knowledgeBaseService.getRelevantKnowledge(campaign.id, userMessage);
      if (relevantKnowledge && relevantKnowledge.length > 0) {
        const formattedKnowledge = relevantKnowledge.map(k => k.pageContent).join('\n\n');
        messages.push({
          role: 'system',
          content: `Релевантная информация из базы знаний:\n${formattedKnowledge}`
        });
      }
    }

    // Добавляем историю сообщений
    messages.push(...history);

    // Добавляем текущее сообщение пользователя
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Проверяем, что все сообщения имеют правильный формат
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }));

  } catch (error) {
    logger.error(`Error generating messages: ${error.message}`);
    return [
      { role: 'system', content: campaign.prompt },
      { role: 'user', content: userMessage }
    ];
  }
}

module.exports = {
  generateMessages,
};