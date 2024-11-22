// src/services/llm/agents/agentChain.js

const OpenAI = require('openai');

const { countTokens } = require('../../tokenizer/tokenizer');
const logger = require('../../../utils/logger');
const EnhancedMemory = require('../memory/enhancedMemory');
const config = require('../../../config');
const { safeStringify } = require('../../../utils/helpers');
const promptService = require('../prompts/promptService');

class AgentGPT {
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
    this.openai = new OpenAI({ apiKey: this.openaiApiKey });
    this.lastUsed = Date.now();
  }

  async run(userMessage) {
    this.lastUsed = Date.now();
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ 
        userMessage, 
        resolve, 
        reject,
        contextInfo: {
          lead: this.lead,
          campaign: this.campaign
        }
      });

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

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

    const messagesInfo = [];
    while (this.messageQueue.length > 0) {
      messagesInfo.push(this.messageQueue.shift());
    }

    const messagesToProcess = messagesInfo.map(info => info.userMessage);
    const concatenatedMessage = messagesToProcess.join(' ');

    try {
      const messages = await promptService.generateMessages(
        this.lead,
        this.campaign,
        concatenatedMessage,
        this.memory
      );

      logger.info(`Context: ${safeStringify(messages)}`);

      const response = await this.openai.chat.completions.create({
        model: this.campaign.modelName || 'gpt-4o-mini',
        messages: messages,
        temperature: 0.5,
      });

      let responseText = response.choices[0].message.content;

      if (response.choices[0].message.function_call) {
        const functionCall = response.choices[0].message.function_call;
        const tool = this.tools.find(t => t.name === functionCall.name);
        if (tool) {
          const args = JSON.parse(functionCall.arguments);
          // Добавляем контекстную информацию к аргументам
          const fullArgs = {
            ...args,
            lead: this.lead,
            campaign: this.campaign
          };
          const result = await tool.invoke(fullArgs);
          responseText += `\nTool ${functionCall.name} result: ${result}`;
        }
      }

      await this.memory.saveContext(
        { input: concatenatedMessage },
        { output: responseText },
      );

      this.updateTokenCount(concatenatedMessage, responseText);

      for (const { resolve } of messagesInfo) {
        resolve(responseText);
      }

      this.isProcessing = false;

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

module.exports = AgentGPT;
