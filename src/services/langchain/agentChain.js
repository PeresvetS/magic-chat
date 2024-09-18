// src/services/langchain/agentChain.js

const { LLMChain } = require("langchain/chains");
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence, RunnablePassthrough } = require("@langchain/core/runnables");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { countTokens } = require('../tokenizer/tokenizer');
const logger = require('../../utils/logger');
const EnhancedMemory = require('./enhancedMemory');
const config = require('../../config');
const knowledgeBaseService = require('./knowledgeBaseService');
const promptService = require('../prompt/promptService');

class AgentChain {
  constructor(campaign, lead) {
    this.campaign = campaign;
    this.lead = lead;
    this.tokenCount = 0;
    this.context = {};
    // Добавляем проверки и значение по умолчанию
    this.openaiApiKey = config.OPENAI_API_KEY;
    if (campaign && campaign.openaiApiKey) {
      this.openaiApiKey = campaign.openaiApiKey;
    } else if (campaign && campaign.user && campaign.user.openaiApiKey) {
      this.openaiApiKey = campaign.user.openaiApiKey;
    }

    this.memory = new EnhancedMemory({
      openAIApiKey: this.openaiApiKey,
      pineconeApiKey: config.PINECONE_API_KEY,
      pineconeEnvironment: config.PINECONE_ENVIRONMENT,
      pineconeIndex: config.PINECONE_INDEX,
      maxTokens: 4000,
      summaryModelName: "gpt-4o-mini",
      conversationId: lead.id,
      leadId: lead.id,
    });

    this.primaryAgent = this.createPrimaryAgent();
    this.secondaryAgent = this.createSecondaryAgent();
  }

  createPrimaryAgent() {
    try {
      const llm = new ChatOpenAI({
        modelName: this.campaign.modelName || 'gpt-4o-mini',
        temperature: 0.2,
        openAIApiKey: this.openaiApiKey,
      });

      const basePrompt = PromptTemplate.fromTemplate(this.campaign.prompt.content);
      
      const promptWithKnowledge = async (relevantKnowledge) => {
        const updatedPromptContent = await promptService.updatePromptWithKnowledge(this.campaign.promptId, relevantKnowledge);
        return PromptTemplate.fromTemplate(updatedPromptContent);
      };

      logger.info(`Created primary agent for campaign: ${this.campaign.id}`);
      return new LLMChain({ 
        llm, 
        prompt: async (input) => {
          if (input.relevantKnowledge) {
            return promptWithKnowledge(input.relevantKnowledge);
          }
          return basePrompt;
        },
        memory: this.memory 
      });
    } catch (error) {
      logger.error(`Error creating primary agent: ${error.message}`);
      throw error;
    }
  }

  createSecondaryAgent() {
    if (!this.campaign.isSecondaryAgentActive || !this.campaign.secondaryPrompt) {
      return null;
    }

    try {
      const llm = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
        openAIApiKey: this.openaiApiKey,
      });

      const prompt = PromptTemplate.fromTemplate(this.campaign.secondaryPrompt.content);

      logger.info(`Created secondary agent for campaign: ${this.campaign.id}`);
      return new LLMChain({ llm, prompt, memory: this.memory });
    } catch (error) {
      logger.error(`Error creating secondary agent: ${error.message}`);
      throw error;
    }
  }

  addContext(key, value) {
    this.context[key] = value;
    logger.info(`Added context: ${key} for campaign: ${this.campaign.id}`);
  }

  async run(userMessage) {
    try {
      const context = await this.memory.getContextString(userMessage);

      let relevantKnowledge = '';
      if (this.campaign.knowledgeBases && this.campaign.knowledgeBases.length > 0) {
        const knowledgeBlocks = await knowledgeBaseService.getRelevantKnowledge(
          this.campaign.id,
          userMessage,
          this.campaign.maxKnowledgeBlocks
        );
        relevantKnowledge = knowledgeBlocks.map(block => block.pageContent).join('\n\n');
      }

      const runChain = RunnableSequence.from([
        {
          lead: new RunnablePassthrough(),
          context: new RunnablePassthrough(),
          relevantKnowledge: new RunnablePassthrough(),
          ...this.context
        },
        this.primaryAgent,
        new StringOutputParser(),
        async (primaryResponse) => {
          if (primaryResponse.includes('FUNCTION_CALL:')) {
            return primaryResponse;
          }

          if (this.secondaryAgent) {
            const secondaryResponse = await this.secondaryAgent.call({
              primaryResponse,
              context,
              ...this.context
            });

            this.updateTokenCount(primaryResponse, secondaryResponse.text);

            return secondaryResponse.text;
          }

          return primaryResponse;
        }
      ]);

      const finalResponse = await runChain.invoke({
        lead: this.lead,
        context,
        relevantKnowledge
      });

      this.updateTokenCount(context, finalResponse);

      await this.memory.saveContext({ input: userMessage }, { output: finalResponse });

      logger.info(`Generated response for lead: ${this.lead.id} in campaign: ${this.campaign.id}`);
      return finalResponse;
    } catch (error) {
      logger.error(`Error in AgentChain: ${error.message}`);
      throw error;
    }
  }

  updateTokenCount(input, output) {
    this.tokenCount += countTokens(input) + countTokens(output);
    logger.info(`Updated token count for campaign: ${this.campaign.id}. Total: ${this.tokenCount}`);
  }

  getTokenCount() {
    return this.tokenCount;
  }

  async loadFullConversation() {
    try {
      const conversation = await this.memory.loadFullConversation();
      logger.info(`Loaded full conversation for lead: ${this.lead.id} in campaign: ${this.campaign.id}`);
      return conversation;
    } catch (error) {
      logger.error(`Error loading full conversation: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AgentChain;