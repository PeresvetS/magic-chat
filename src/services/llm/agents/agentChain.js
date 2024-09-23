// src/services/llm/agents/agentChain.js

const { ChatOpenAI } = require('@langchain/openai');
const {
  RunnableSequence,
  RunnablePassthrough,
} = require('@langchain/core/runnables');

const { countTokens } = require('../../tokenizer/tokenizer');
const logger = require('../../../utils/logger');
const EnhancedMemory = require('../memory/enhancedMemory');
const config = require('../../../config');
const { safeStringify } = require('../../../utils/helpers');
const promptService = require('../prompts/promptService');

class AgentChain {
  constructor(campaign, lead, tools) {
    this.campaign = campaign;
    this.lead = lead;
    this.tokenCount = 0;
    this.openaiApiKey = config.OPENAI_API_KEY;
    this.messageQueue = [];
    this.isProcessing = false;
    this.debounceTimer = null;
    this.debounceDelay = 1000; // 1 second delay
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

    this.tools = tools;
  }

  async preparePromptTemplate(promptContent) {
    return await promptService.composePromptTemplate(promptContent);
  }

  async createPrimaryAgent() {
    try {
      const llm = new ChatOpenAI({
        modelName: this.campaign.modelName || 'gpt-4o-mini',
        temperature: 0.5,
        openAIApiKey: this.openaiApiKey,
      });

      const composePromptTemplate = await this.preparePromptTemplate(this.campaign.prompt.content);

      const llmWithTools = llm.bindTools(this.tools);

      const chain = RunnableSequence.from([composePromptTemplate, llmWithTools]);

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

    // try {
    //   const llm = new ChatOpenAI({
    //     modelName: 'gpt-4o-mini',
    //     temperature: 0,
    //     openAIApiKey: this.openaiApiKey,
    //   });

    //   const prompt = ChatPromptTemplate.fromTemplate(
    //     this.campaign.secondaryPrompt.content,
    //   ); // здесь не хватат , обновить потом

    //   const chain = RunnableSequence.from([prompt, llm]);

    //   logger.info(`Created secondary agent for campaign: ${this.campaign.id}`);
    //   return chain;
    // } catch (error) {
    //   logger.error(`Error creating secondary agent: ${error.message}`);
    //   throw error;
    // }
  }

  addContext(key, value) {
    this.context[key] = value;
    logger.info(`Added context: ${key} for campaign: ${this.campaign.id}`);
  }

  async run(userMessage) {
    return new Promise((resolve, reject) => {
      // Add the message and its resolve function to the queue
      this.messageQueue.push({ userMessage, resolve, reject });

      // Reset the debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Start a new debounce timer
      this.debounceTimer = setTimeout(async () => {
        await this.processMessages();
      }, this.debounceDelay);
    });
  }

  async processMessages() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    // Get all messages and their resolve/reject functions
    const messagesInfo = [];
    while (this.messageQueue.length > 0) {
      messagesInfo.push(this.messageQueue.shift());
    }

    const messagesToProcess = messagesInfo.map(info => info.userMessage);
    const concatenatedMessage = messagesToProcess.join(' ');

    try {
      const prompt = await promptService.generateUserPrompt(
        this.lead,
        this.campaign,
        concatenatedMessage,
        this.memory
      );

      logger.info(`Context: ${safeStringify(prompt)}`);

      const runChain = RunnableSequence.from([
        RunnablePassthrough.assign({
          context: () => ({ prompt }), // Обновлено: передаем объект с ключом prompt
        }),
        this.primaryAgent,
        async (primaryResponse) => {
          if (!primaryResponse) {
            logger.warn('Primary response is undefined or null');
            return 'No response generated';
          }

          let responseText = primaryResponse.content || primaryResponse;

          if (primaryResponse.tool_calls && primaryResponse.tool_calls.length > 0) {
            // Обработка вызовов инструментов
            for (const toolCall of primaryResponse.tool_calls) {
              const tool = this.tools.find(t => t.name === toolCall.name);
              if (tool) {
                const result = await tool.invoke(JSON.parse(toolCall.args));
                responseText += `\nTool ${toolCall.name} result: ${result}`;
              }
            }
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

      const finalResponse = await runChain.invoke({
        input: concatenatedMessage,
      });

      const responseString =
        typeof finalResponse === 'string'
          ? finalResponse
          : JSON.stringify(finalResponse);

      // Сохраняем контекст
      await this.memory.saveContext(
        { input: concatenatedMessage },
        { output: responseString },
      );

      this.updateTokenCount(concatenatedMessage, responseString);

      // After processing, resolve all pending promises with the response
      for (const { resolve } of messagesInfo) {
        resolve(responseString);
      }

      this.isProcessing = false;

      // Check if new messages arrived during processing
      if (this.messageQueue.length > 0) {
        await this.processMessages();
      }
    } catch (error) {
      this.isProcessing = false;
      for (const { reject } of messagesInfo) {
        reject(error);
      }
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
