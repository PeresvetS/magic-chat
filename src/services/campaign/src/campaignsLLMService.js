// src/services/campaign/campaignsLLMService.js

const { campaignsMailingRepo } = require('../../../db');
const logger = require('../../../utils/logger');


async function setGoogleSheetUrl(id, googleSheetUrl) {
    try {
      return await campaignsMailingRepo.setGoogleSheetUrl(id, googleSheetUrl);
    } catch (error) {
      logger.error('Error in setGoogleSheetUrl service:', error);
      throw error;
    }
  }

  async function setCampaignPrompt(id, promptId) {
    try {
      return await campaignsMailingRepo.setCampaignPrompt(id, promptId);
    } catch (error) {
      logger.error('Error in setCampaignPrompt service:', error);
      throw error;
    }
  }

  async function setSecondaryPrompt(id, promptId) {
    try {
      return await campaignsMailingRepo.setSecondaryPrompt(id, promptId);
    } catch (error) {
      logger.error('Error in setSecondaryPrompt service:', error);
      throw error;
    }
  }

  async function toggleSecondaryAgent(id, isActive) {
    try {
      return await campaignsMailingRepo.toggleSecondaryAgent(id, isActive);
    } catch (error) {
      logger.error('Error in toggleSecondaryAgent service:', error);
      throw error;
    }
  }


  async function setCampaignModel(id, modelName) {
    try {
      return await campaignsMailingRepo.setCampaignModel(id, modelName);
    } catch (error) {
      logger.error('Error in setCampaignModel service:', error);
      throw error;
    }
  }

  async function getCampaignModel(id) {
    try {
      return await campaignsMailingRepo.getCampaignModel(id);
    } catch (error) {
      logger.error('Error in getCampaignModel service:', error);
      throw error;
    }
  }

  async function setCampaignOpenAIKey(id, openaiApiKey) {
    try {
      return await campaignsMailingRepo.setCampaignOpenAIKey(id, openaiApiKey);
    } catch (error) {
      logger.error('Error in setCampaignOpenAIKey service:', error);
      throw error;
    }
  }

module.exports = {
    setGoogleSheetUrl,
    setCampaignPrompt,
    setSecondaryPrompt,
    toggleSecondaryAgent,
    setCampaignModel,
    setCampaignOpenAIKey,
    getCampaignModel,
};
