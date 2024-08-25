// src/bot/user/commands/parsingCommands.js

// const { startParsing, stopParsing, getParsingStatus } = require('../../../services/parsing/parsingService');
const { campaignsParsingService } = require('../../../services/campaign');

module.exports = {
  '/start_parsing (.+)': async (bot, msg, match) => {
    const [, groupUsername] = match;
    try {
      // await startParsing(msg.from.id, groupUsername);
      bot.sendMessage(msg.chat.id, `Начат парсинг группы ${groupUsername}.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при начале парсинга: ${error.message}`);
    }
  },

  '/stop_parsing': async (bot, msg) => {
    try {
      // await stopParsing(msg.from.id);
      bot.sendMessage(msg.chat.id, 'Парсинг остановлен.');
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при остановке парсинга: ${error.message}`);
    }
  },

  '/parsing_status': async (bot, msg) => {
    try {
      // const status = await getParsingStatus(msg.from.id);
      bot.sendMessage(msg.chat.id, `Статус парсинга: ${status}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении статуса парсинга: ${error.message}`);
    }
  },

  '/create_pc (.+)': async (bot, msg, match) => {
    const [, campaignName] = match;
    try {
      const campaignId = await campaignsParsingService.createCampaign(msg.from.id, campaignName);
      bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" создана с ID: ${campaignId}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при создании кампании: ${error.message}`);
    }
  },

  '/list_pc': async (bot, msg) => {
    try {
      const campaigns = await campaignsParsingService.listCampaigns(msg.from.id);
      bot.sendMessage(msg.chat.id, `Ваши кампании:\n${campaigns.map(c => `${c.id}: ${c.name}`).join('\n')}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении списка кампаний: ${error.message}`);
    }
  },

  '/stats_pc (\\d+)': async (bot, msg, match) => {
    const [, campaignId] = match;
    try {
      const stats = await campaignsParsingService.getCampaignStats(msg.from.id, parseInt(campaignId));
      bot.sendMessage(msg.chat.id, `Статистика кампании ${campaignId}:\n${JSON.stringify(stats, null, 2)}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении статистики кампании: ${error.message}`);
    }
  }
};