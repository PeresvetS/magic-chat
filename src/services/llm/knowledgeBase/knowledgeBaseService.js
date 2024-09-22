// src/services/knowledgebase/KnowledgeBaseService.jss

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { v4: uuidv4 } = require('uuid');

const { knowledgeBaseRepo, campaignsMailingRepo } = require('../../../db');
const config = require('../../../config');
const logger = require('../../../utils/logger');
const { processFile } = require('../../../utils/fileProcessing');

class KnowledgeBaseService {
  constructor() {
    this.pinecone = new Pinecone();
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.OPENAI_API_KEY,
    });
    this.campaignId = null;
  }

  setCampaignId(campaignId) {
    this.campaignId = campaignId;
  }

  async createKnowledgeBase(name, description, campaignId, documents) {
    if (!this.campaignId) {
      throw new Error('Campaign ID is not set');
    }

    try {
      // Check if the campaign exists
      const campaign = await campaignsMailingRepo.getCampaignById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }

      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);

      // Generate a unique pineconeId
      const uniquePineconeId = `${config.PINECONE_INDEX}_${uuidv4()}`;

      const vectorStore = await PineconeStore.fromDocuments(
        documents,
        this.embeddings,
        {
          pineconeIndex,
          namespace: uniquePineconeId,
        },
      );

      const knowledgeBase = await knowledgeBaseRepo.create({
        name,
        description,
        pineconeId: uniquePineconeId,
        campaignId,
      });

      logger.info(
        `Created knowledge base: ${knowledgeBase.id} for campaign: ${campaignId}`,
      );
      return knowledgeBase;
    } catch (error) {
      logger.error(`Error creating knowledge base: ${error.message}`);
      throw error;
    }
  }

  async getRelevantKnowledge(campaignId, query, maxBlocks) {
    if (!this.campaignId) {
      throw new Error('Campaign ID is not set');
    }

    try {
      const knowledgeBases =
        await knowledgeBaseRepo.findByCampaignId(campaignId);
      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);

      let allResults = [];

      for (const kb of knowledgeBases) {
        const vectorStore = await PineconeStore.fromExistingIndex(
          this.embeddings,
          {
            pineconeIndex,
            namespace: kb.pineconeId,  // Use the unique pineconeId here
          },
        );

        const results = await vectorStore.similaritySearch(query, maxBlocks);
        allResults = allResults.concat(results);
      }

      allResults.sort((a, b) => b.score - a.score);
      const limitedResults = allResults.slice(0, maxBlocks);

      logger.info(
        `Retrieved ${limitedResults.length} relevant knowledge blocks for campaign: ${campaignId}`,
      );
      return limitedResults;
    } catch (error) {
      logger.error(`Error getting relevant knowledge: ${error.message}`);
      throw error;
    }
  }

  async getKnowledgeBaseByName(name) {
    try {
      const knowledgeBase = await knowledgeBaseRepo.findByName(name);
      return knowledgeBase;
    } catch (error) {
      logger.error(`Error getting knowledge base by name: ${error.message}`);
      throw error;
    }
  }

  async getKnowledgeBaseByCampaignId() {
    try {
      const knowledgeBase = await knowledgeBaseRepo.findByCampaignId(this.campaignId);
      return knowledgeBase;
    } catch (error) {
      logger.error(`Error getting knowledge base by campaign id: ${error.message}`);
      throw error;
    }
  }

  async listKnowledgeBases() {
    try {
      const knowledgeBases = await knowledgeBaseRepo.findAll();
      return knowledgeBases;
    } catch (error) {
      logger.error(`Error listing knowledge bases: ${error.message}`);
      throw error;
    }
  }

  async getCampaignKnowledgeBases(id) {
    try {
      const campaign = await campaignsMailingRepo.getCampaignKnowledgeBases(id);
      return campaign.knowledgeBases;
    } catch (error) {
      logger.error(`Error getting knowledge bases for campaign ${id}:`, error);
      throw error;
    }
  }

  async deleteKnowledgeBase(name) {
    try {
      const knowledgeBase = await this.getKnowledgeBaseByName(name);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base "${name}" not found`);
      }
      await knowledgeBaseRepo.delete(knowledgeBase.id);
      // Удаление данных из Pinecone
      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);
      await pineconeIndex.delete1({
        deleteAll: true,
        namespace: `campaign_${knowledgeBase.campaignId}`,
      });
      logger.info(`Deleted knowledge base: ${name}`);
    } catch (error) {
      logger.error(`Error deleting knowledge base: ${error.message}`);
      throw error;
    }
  }

  async addDocumentToKnowledgeBase(kbId, file) {
    try {
      const knowledgeBase = await knowledgeBaseRepo.findById(kbId);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with ID ${kbId} not found`);
      }

      const documents = await processFile(file);

      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);
      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex,
          namespace: knowledgeBase.pineconeId,
        },
      );

      // Добавляем документы порциями
      const batchSize = 100;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await vectorStore.addDocuments(batch);
        logger.info(`Added batch ${i / batchSize + 1} to knowledge base: ${kbId}`);
      }

      logger.info(`Added document to knowledge base: ${kbId}`);
    } catch (error) {
      logger.error(`Error adding document to knowledge base: ${error.message}`);
      throw error;
    }
  }
}

module.exports = KnowledgeBaseService;
