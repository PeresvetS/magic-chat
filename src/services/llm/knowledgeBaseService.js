// src/services/knowledgebase/KnowledgeBaseService.jss

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');

const { knowledgeBaseRepository } = require('../../db');
const config = require('../../config');
const logger = require('../../utils/logger');
const { processFile } = require('../../utils/fileProcessing');

class KnowledgeBaseService {
  constructor() {
    this.pinecone = new Pinecone();
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.OPENAI_API_KEY,
    });
  }

  async createKnowledgeBase(name, description, campaignId, documents) {
    try {
      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);

      const vectorStore = await PineconeStore.fromDocuments(
        documents,
        this.embeddings,
        {
          pineconeIndex,
          namespace: `campaign_${campaignId}`,
        },
      );

      const knowledgeBase = await knowledgeBaseRepository.create({
        name,
        description,
        pineconeId: config.PINECONE_INDEX,
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
    try {
      const knowledgeBases =
        await knowledgeBaseRepository.findByCampaignId(campaignId);
      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);

      let allResults = [];

      for (const kb of knowledgeBases) {
        const vectorStore = await PineconeStore.fromExistingIndex(
          this.embeddings,
          {
            pineconeIndex,
            namespace: `campaign_${campaignId}`,
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
      const knowledgeBase = await knowledgeBaseRepository.findByName(name);
      return knowledgeBase;
    } catch (error) {
      logger.error(`Error getting knowledge base by name: ${error.message}`);
      throw error;
    }
  }

  async listKnowledgeBases() {
    try {
      const knowledgeBases = await knowledgeBaseRepository.findAll();
      return knowledgeBases;
    } catch (error) {
      logger.error(`Error listing knowledge bases: ${error.message}`);
      throw error;
    }
  }

  async deleteKnowledgeBase(name) {
    try {
      const knowledgeBase = await this.getKnowledgeBaseByName(name);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base "${name}" not found`);
      }
      await knowledgeBaseRepository.delete(knowledgeBase.id);
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
      const knowledgeBase = await knowledgeBaseRepository.findById(kbId);
      if (!knowledgeBase) {
        throw new Error(`Knowledge base with ID ${kbId} not found`);
      }

      const documents = await processFile(file);

      const pineconeIndex = this.pinecone.Index(config.PINECONE_INDEX);
      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex,
          namespace: `campaign_${knowledgeBase.campaignId}`,
        },
      );

      await vectorStore.addDocuments(documents);
      logger.info(`Added document to knowledge base: ${kbId}`);
    } catch (error) {
      logger.error(`Error adding document to knowledge base: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new KnowledgeBaseService();
