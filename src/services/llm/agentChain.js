// src/services/langchain/agentChain.js

const { ChatOpenAI } = require('@langchain/openai');
const {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  AIMessagePromptTemplate,
} = require('@langchain/core/prompts');
const {
  RunnableSequence,
  RunnablePassthrough,
} = require('@langchain/core/runnables');

const { countTokens } = require('../tokenizer/tokenizer');
const logger = require('../../utils/logger');
const EnhancedMemory = require('./enhancedMemory');
const config = require('../../config');
const knowledgeBaseService = require('./knowledgeBaseService');
const { safeStringify } = require('../../utils/helpers');

class AgentChain {
  constructor(campaign, lead, googleSheetData) {
    this.campaign = campaign;
    this.lead = lead;
    this.googleSheetData = googleSheetData;
    this.tokenCount = 0;
    this.context = {};
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
      summaryModelName: 'gpt-4o-mini',
      leadId: lead.id,
      userId: campaign.userId,
    });

    this.primaryAgent = this.createPrimaryAgent();
    this.secondaryAgent = this.createSecondaryAgent();
  }

  createPrimaryAgent() {
    try {
      const llm = new ChatOpenAI({
        modelName: this.campaign.modelName || 'gpt-4o-mini',
        temperature: 0.5,
        openAIApiKey: this.openaiApiKey,
      });

      const systemPrompt = SystemMessagePromptTemplate.fromTemplate(
        this.campaign.prompt.content,
      );
      const googleSheetPrompt = SystemMessagePromptTemplate.fromTemplate(
        this.googleSheetData || '',
      );
      const humanTemplate = '{input}';
      const humanMessagePrompt =
        HumanMessagePromptTemplate.fromTemplate(humanTemplate);

      const chatPrompt = ChatPromptTemplate.fromMessages([
        systemPrompt,
        googleSheetPrompt,
        { role: 'system', content: '{context}' },
        humanMessagePrompt,
      ]);

      const chain = RunnableSequence.from([chatPrompt, llm]);

      logger.info(`Created primary agent for campaign: ${this.campaign.id}`);
      return chain;
    } catch (error) {
      logger.error(`Error creating primary agent: ${error.message}`);
      throw error;
    }
  }

  createSecondaryAgent() {
    if (
      !this.campaign.isSecondaryAgentActive ||
      !this.campaign.secondaryPrompt
    ) {
      return null;
    }

    try {
      const llm = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0,
        openAIApiKey: this.openaiApiKey,
      });

      const prompt = ChatPromptTemplate.fromTemplate(
        this.campaign.secondaryPrompt.content,
      );

      const chain = RunnableSequence.from([chatPrompt, llm]);

      logger.info(`Created secondary agent for campaign: ${this.campaign.id}`);
      return chain;
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
      let context = '';
      const contextString = await this.memory.getContextString(userMessage);

      let relevantKnowledge = '';
      if (
        this.campaign.knowledgeBases &&
        this.campaign.knowledgeBases.length > 0
      ) {
        const knowledgeBlocks = await knowledgeBaseService.getRelevantKnowledge(
          this.campaign.id,
          userMessage,
          this.campaign.maxKnowledgeBlocks,
        );
        relevantKnowledge = knowledgeBlocks
          .map((block) => block.pageContent)
          .join('\n\n');
      }
      if (relevantKnowledge) {
        context = `Relevant Knowledge: ${relevantKnowledge}\n\n${contextString}`;
      } else {
        context = contextString;
      }

      logger.info(`Context: ${safeStringify(context)}`);
      logger.info(`Primary agent: ${safeStringify(this.context)}`);

      const runChain = RunnableSequence.from([
        RunnablePassthrough.assign({
          context: () => context,
          ...this.context,
        }),
        this.primaryAgent,
        async (primaryResponse) => {
          if (!primaryResponse) {
            logger.warn('Primary response is undefined or null');
            return 'No response generated';
          }

          let responseText = primaryResponse;
          logger.info(`Primary response: ${safeStringify(primaryResponse)}`);
          if (typeof primaryResponse === 'object') {
            logger.warn(
              `Unexpected primary response type: ${typeof primaryResponse}`,
            );
            responseText =
              primaryResponse.output ||
              primaryResponse.text ||
              JSON.stringify(primaryResponse);
          }

          if (responseText.includes('FUNCTION_CALL:')) {
            // ?
            return responseText;
          }

          if (this.campaign.isSecondaryAgentActive && this.secondaryAgent) {
            const secondaryResponse = await this.secondaryAgent.call({
              input: responseText,
              ...this.context,
            });

            this.updateTokenCount(responseText, secondaryResponse.text || '');

            return secondaryResponse.text || JSON.stringify(secondaryResponse);
          }

          return responseText;
        },
      ]);

      logger.info(`Context: ${safeStringify(context)}`);

      const finalResponse = await runChain.invoke({
        input: userMessage,
      });

      const responseString =
        typeof finalResponse === 'string'
          ? finalResponse
          : JSON.stringify(finalResponse);

      // Сохраняем контекст
      await this.memory.saveContext(
        { input: userMessage },
        { output: responseString },
      );

      this.updateTokenCount(userMessage, responseString);

      return responseString;
    } catch (error) {
      logger.error(`Error in AgentChain: ${error.message}`);
      logger.error(`Stack trace: ${error.stack}`);
      return `An error occurred: ${error.message}`;
    }
  }

  updateTokenCount(input, output) {
    this.tokenCount += countTokens(input) + countTokens(output);
    logger.info(
      `Updated token count for campaign: ${this.campaign.id}. Total: ${this.tokenCount}`,
    );
  }

  getTokenCount() {
    return this.tokenCount;
  }
}

module.exports = AgentChain;
