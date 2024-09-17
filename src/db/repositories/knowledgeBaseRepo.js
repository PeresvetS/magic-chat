// src/db/repositories/knowledgeBaseRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

const knowledgeBaseRepository = {
  async create(data) {
    try {
      const result = await prisma.knowledgeBase.create({ data });
      logger.info(`Created knowledge base: ${result.id}`);
      return result;
    } catch (error) {
      logger.error(`Error creating knowledge base: ${error.message}`);
      throw error;
    }
  },

  async findById(id) {
    try {
      const result = await prisma.knowledgeBase.findUnique({ where: { id } });
      logger.info(`Found knowledge base: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error finding knowledge base by id: ${error.message}`);
      throw error;
    }
  },

  async findByCampaignId(campaignId) {
    try {
      const result = await prisma.knowledgeBase.findMany({ where: { campaignId } });
      logger.info(`Found ${result.length} knowledge bases for campaign: ${campaignId}`);
      return result;
    } catch (error) {
      logger.error(`Error finding knowledge bases by campaign id: ${error.message}`);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const result = await prisma.knowledgeBase.update({ where: { id }, data });
      logger.info(`Updated knowledge base: ${id}`);
      return result;
    } catch (error) {
      logger.error(`Error updating knowledge base: ${error.message}`);
      throw error;
    }
  },

  async delete(id) {
    try {
      await prisma.knowledgeBase.delete({ where: { id } });
      logger.info(`Deleted knowledge base: ${id}`);
    } catch (error) {
      logger.error(`Error deleting knowledge base: ${error.message}`);
      throw error;
    }
  },

  async findByName(name) {
    try {
      const result = await prisma.knowledgeBase.findFirst({ where: { name } });
      logger.info(`Found knowledge base by name: ${name}`);
      return result;
    } catch (error) {
      logger.error(`Error finding knowledge base by name: ${error.message}`);
      throw error;
    }
  },

  async findAll() {
    try {
      const result = await prisma.knowledgeBase.findMany();
      logger.info(`Found ${result.length} knowledge bases`);
      return result;
    } catch (error) {
      logger.error(`Error finding all knowledge bases: ${error.message}`);
      throw error;
    }
  },
};

module.exports = knowledgeBaseRepository;