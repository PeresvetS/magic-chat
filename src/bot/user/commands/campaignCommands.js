// src/bot/user/commands/campaignCommands.js

const { createCampaign, listCampaigns, getCampaignStats } = require('../../../services/campaign/campaignService');

module.exports = {
  '/createcampaign (.+)': async (bot, msg, match) => {
    const [, campaignName] = match;
    try {
      const campaignId = await createCampaign(msg.from.id, campaignName);
      bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" создана с ID: ${campaignId}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при создании кампании: ${error.message}`);
    }
  },

  '/listcampaigns': async (bot, msg) => {
    try {
      const campaigns = await listCampaigns(msg.from.id);
      bot.sendMessage(msg.chat.id, `Ваши кампании:\n${campaigns.map(c => `${c.id}: ${c.name}`).join('\n')}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении списка кампаний: ${error.message}`);
    }
  },

  '/campaignstats (\\d+)': async (bot, msg, match) => {
    const [, campaignId] = match;
    try {
      const stats = await getCampaignStats(msg.from.id, parseInt(campaignId));
      bot.sendMessage(msg.chat.id, `Статистика кампании ${campaignId}:\n${JSON.stringify(stats, null, 2)}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении статистики кампании: ${error.message}`);
    }
  }
};