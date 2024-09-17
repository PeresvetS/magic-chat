// src/services/langchain/enhancedMemory.js

const { VectorStoreRetrieverMemory } = require("langchain/memory");
const { PineconeStore } = require("@langchain/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { Pinecone } = require("@pinecone-database/pinecone");
const { ConversationSummaryMemory } = require("langchain/memory");
const { ChatOpenAI } = require("@langchain/openai");
const { countTokens } = require('../tokenizer/tokenizer');
const { saveConversationState } = require('../../db');
const SupabaseQueueService = require('../queue/supabaseQueueService');
const logger = require('../../utils/logger');

class EnhancedMemory {
  constructor(config) {
    this.pinecone = new Pinecone();
    this.openAIApiKey = config.openAIApiKey;
    this.pineconeIndex = config.pineconeIndex;
    this.conversationId = config.conversationId;
    this.maxTokens = config.maxTokens || 4000;
    this.summaryModelName = config.summaryModelName || "gpt-4o-mini";
    this.leadId = config.leadId;

    this.initializePinecone();
  }

  async initializePinecone() {
    try {
      const pineconeIndex = this.pinecone.Index(this.pineconeIndex);

      this.vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey }),
        { pineconeIndex }
      );

      this.vectorStoreMemory = new VectorStoreRetrieverMemory({
        vectorStoreRetriever: this.vectorStore.asRetriever(),
        inputKey: "input",
        outputKey: "output",
        memoryKey: "history",
      });

      this.summaryMemory = new ConversationSummaryMemory({
        llm: new ChatOpenAI({ 
          modelName: this.summaryModelName,
          openAIApiKey: this.openAIApiKey 
        }),
        inputKey: "input",
        outputKey: "output",
        memoryKey: "summary",
      });

      logger.info(`Initialized Pinecone for conversation: ${this.conversationId}`);
    } catch (error) {
      logger.error(`Error initializing Pinecone: ${error.message}`);
      throw error;
    }
  }

  async saveContext(inputValues, outputValues) {
    try {
      const input = inputValues.input;
      const output = outputValues.output;

      await this.vectorStoreMemory.saveContext(inputValues, outputValues);
      await this.summaryMemory.saveContext(inputValues, outputValues);

      await this.vectorStore.addDocuments([
        { pageContent: input, metadata: { role: "human", conversationId: this.conversationId } },
        { pageContent: output, metadata: { role: "ai", conversationId: this.conversationId } }
      ]);

      const summary = await this.summaryMemory.predictNewSummary(inputValues, outputValues);
      await saveConversationState(this.leadId, output, summary);

      await SupabaseQueueService.enqueue(
        this.conversationId,
        output,
        this.leadId,
        'langchain',
        null,
        {
          input,
          summary,
          leadId: this.leadId,
        }
      );

      logger.info(`Saved context for conversation: ${this.conversationId}`);
    } catch (error) {
      logger.error(`Error saving context: ${error.message}`);
      throw error;
    }
  }

  async loadMemoryVariables() {
    try {
      const vectorStoreResult = await this.vectorStoreMemory.loadMemoryVariables({});
      const summaryResult = await this.summaryMemory.loadMemoryVariables({});

      let history = vectorStoreResult.history;
      const summary = summaryResult.summary;

      let summaryTokens = countTokens(summary);
      let historyTokens = countTokens(JSON.stringify(history));
      
      while (summaryTokens + historyTokens > this.maxTokens && history.length > 0) {
        history.shift();
        historyTokens = countTokens(JSON.stringify(history));
      }

      logger.info(`Loaded memory variables for conversation: ${this.conversationId}`);
      return { history, summary };
    } catch (error) {
      logger.error(`Error loading memory variables: ${error.message}`);
      throw error;
    }
  }

  async getContextString(userMessage) {
    try {
      const { history, summary } = await this.loadMemoryVariables();
      const historyString = history.map(m => `${m.role}: ${m.content}`).join('\n');
      const contextString = `Summary: ${summary}\n\nRecent conversation:\n${historyString}\n\nHuman: ${userMessage}\nAI:`;
      
      logger.info(`Generated context string for conversation: ${this.conversationId}`);
      return contextString;
    } catch (error) {
      logger.error(`Error getting context string: ${error.message}`);
      throw error;
    }
  }

  async loadFullConversation() {
    try {
      const results = await this.vectorStore.similaritySearch("", 1000, { 
        conversationId: this.conversationId 
      });

      const sortedResults = results.map(result => ({
        role: result.metadata.role,
        content: result.pageContent,
        created_at: result.metadata.created_at || new Date().toISOString()
      })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      logger.info(`Loaded full conversation: ${this.conversationId}`);
      return sortedResults;
    } catch (error) {
      logger.error(`Error loading full conversation: ${error.message}`);
      throw error;
    }
  }
}

module.exports = EnhancedMemory;