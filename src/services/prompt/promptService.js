// src/services/prompt/promptService.js

const logger = require('../../utils/logger');
const { promptRepo } = require('../../db');

const promptService = {
  async createPrompt(name, content) {
    try {
      logger.info(`Attempting to create prompt: ${name}`);
      const prompt = await promptRepo.createPrompt(name, content);
      logger.info(`Prompt created: ${prompt.id}`);
      return prompt;
    } catch (error) {
      logger.error('Error creating prompt:', error);
      throw error;
    }
  },

  async getPromptById(id) {
    try {
      return await promptRepo.getPromptById(id);
    } catch (error) {
      logger.error(`Error getting prompt by id ${id}:`, error);
      throw error;
    }
  },

  async getPromptByName(name) {
    try {
      return await promptRepo.getPromptByName(name);
    } catch (error) {
      logger.error(`Error getting prompt by name ${name}:`, error);
      throw error;
    }
  },

  async updatePrompt(id, content) {
    try {
      const updatedPrompt = await promptRepo.updatePrompt(id, content);
      logger.info(`Prompt updated: ${id}`);
      return updatedPrompt;
    } catch (error) {
      logger.error(`Error updating prompt ${id}:`, error);
      throw error;
    }
  },

  async updatePromptWithKnowledge(promptId, relevantKnowledge) {
    try {
      const prompt = await this.getPromptById(promptId);
      const updatedContent = `${prompt.content}\n\nRelevant knowledge:\n${relevantKnowledge}`;
      return updatedContent;
    } catch (error) {
      logger.error(`Error updating prompt ${promptId} with knowledge:`, error);
      throw error;
    }
  },

  async deletePrompt(id) {
    try {
      await promptRepo.deletePrompt(id);
      logger.info(`Prompt deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting prompt ${id}:`, error);
      throw error;
    }
  },

  async listPrompts() {
    try {
      return await promptRepo.listPrompts();
    } catch (error) {
      logger.error('Error listing prompts:', error);
      throw error;
    }
  },
};

module.exports = promptService;
