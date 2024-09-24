// src/bot/user/commands/campagnLLMCommands.js

const { campaignsLLMService } = require('../../../services/campaign');
const { getCampaignByName } =
  require('../../../services/campaign').campaignsMailingService;
const logger = require('../../../utils/logger');
const promptService = require('../../../services/prompt/promptService');

module.exports = {
  '/set_campaign_openai_key ([^\\s]+) (.+)': async (bot, msg, match) => {
    const [, campaignName, openaiApiKey] = match;
    if (!campaignName || !openaiApiKey) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название кампании и ключ API OpenAI. Например: /set_campaign_openai_key МояКампания sk-...',
      );
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) {
        return;
      }

      await campaignsLLMService.setCampaignOpenAIKey(campaign.id, openaiApiKey);
      bot.sendMessage(
        msg.chat.id,
        `Ключ API OpenAI успешно установлен для кампании "${campaignName}".`,
      );
    } catch (error) {
      logger.error('Error setting campaign OpenAI API key:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при установке ключа API OpenAI для кампании.',
      );
    }
  },

  '/set_campaign_model ([^\\s]+) (.+)': async (bot, msg, match) => {
    const [, campaignName, modelName] = match;
    if (!campaignName || !modelName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название кампании и название модели. Например: /set_campaign_model МояКампания gpt-3.5-turbo',
      );
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) {
        return;
      }

      await campaignsLLMService.setCampaignModel(campaign.id, modelName);
      bot.sendMessage(
        msg.chat.id,
        `Модель "${modelName}" успешно установлена для кампании "${campaignName}".`,
      );
    } catch (error) {
      logger.error('Error setting campaign model:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при установке модели для кампании.',
      );
    }
  },

  '/get_campaign_model ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;
    if (!campaignName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название кампании. Например: /get_campaign_model МояКампания',
      );
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) {
        return;
      }
      const model = await campaignsLLMService.getCampaignModel(campaign.id);
      bot.sendMessage(
        msg.chat.id,
        `Модель для кампании "${campaignName}": ${model}`,
      );
    } catch (error) {
      logger.error('Error getting campaign model:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при получении модели для кампании.',
      );
    }
  },

  '/set_campaign_prompt ([^\\s]+) ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName, promptName] = match;
    if (!campaignName || !promptName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название кампании и название промпта. Например: /set_campaign_prompt МояКампания МойПромпт',
      );
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) {
        return;
      }

      const prompt = await promptService.getPromptByName(promptName);
      if (!prompt) {
        bot.sendMessage(msg.chat.id, `Промпт "${promptName}" не найден.`);
        return;
      }

      await campaignsLLMService.setCampaignPrompt(campaign.id, prompt.id);
      bot.sendMessage(
        msg.chat.id,
        `Промпт "${promptName}" успешно установлен для кампании "${campaignName}".`,
      );
    } catch (error) {
      logger.error('Error setting campaign prompt:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при установке промпта для кампании.',
      );
    }
  },

  '/set_google_sheet ([^\\s]+) (.+)': async (bot, msg, match) => {
    const [, campaignName, googleSheetUrl] = match;

    if (!campaignName || !googleSheetUrl) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название кампании и URL Google таблицы. Например: /set_google_sheet МояКампания https://docs.google.com/spreadsheets/d/...',
      );
      return;
    }

    try {
      const campaign =
        await campaignsLLMService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      // Простая проверка формата URL
      if (
        !googleSheetUrl.startsWith('https://docs.google.com/spreadsheets/d/')
      ) {
        bot.sendMessage(
          msg.chat.id,
          'Пожалуйста, укажите корректный URL Google таблицы.',
        );
        return;
      }

      await campaignsLLMService.setGoogleSheetUrl(campaign.id, googleSheetUrl);
      bot.sendMessage(
        msg.chat.id,
        `Google таблица успешно подключена к кампании "${campaignName}".`,
      );
    } catch (error) {
      logger.error('Error setting Google Sheet URL:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при подключении Google таблицы. Пожалуйста, попробуйте позже.',
      );
    }
  },
};
