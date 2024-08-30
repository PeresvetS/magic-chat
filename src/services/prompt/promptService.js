// src/services/prompt/promptService.js

const { PrismaClient } = require('@prisma/client');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

const promptService = {
  async createPrompt(name, content) {
    try {
      const prompt = await prisma.prompt.create({
        data: {
          name,
          content
        }
      });
      logger.info(`Prompt created: ${prompt.id}`);
      return prompt;
    } catch (error) {
      logger.error('Error creating prompt:', error);
      throw error;
    }
  },

  async getPromptById(id) {
    try {
      const prompt = await prisma.prompt.findUnique({
        where: { id }
      });
      return prompt;
    } catch (error) {
      logger.error(`Error getting prompt by id ${id}:`, error);
      throw error;
    }
  },

  async getPromptByName(name) {
    try {
      const prompt = await prisma.prompt.findUnique({
        where: { name }
      });
      return prompt;
    } catch (error) {
      logger.error(`Error getting prompt by name ${name}:`, error);
      throw error;
    }
  },

  async updatePrompt(id, content) {
    try {
      const updatedPrompt = await prisma.prompt.update({
        where: { id },
        data: { content }
      });
      logger.info(`Prompt updated: ${id}`);
      return updatedPrompt;
    } catch (error) {
      logger.error(`Error updating prompt ${id}:`, error);
      throw error;
    }
  },

  async deletePrompt(id) {
    try {
      await prisma.prompt.delete({
        where: { id }
      });
      logger.info(`Prompt deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting prompt ${id}:`, error);
      throw error;
    }
  },

  async listPrompts() {
    try {
      const prompts = await prisma.prompt.findMany();
      return prompts;
    } catch (error) {
      logger.error('Error listing prompts:', error);
      throw error;
    }
  }
};

module.exports = promptService;