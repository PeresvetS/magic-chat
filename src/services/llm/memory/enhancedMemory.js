// src/services/llm/enhancedMemory.js

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

const { countTokens } = require('../../tokenizer/tokenizer');
const messageService = require('../../dialog/messageService');
const { safeStringify } = require('../../../utils/helpers');
const logger = require('../../../utils/logger');

class EnhancedMemory {
  constructor(args) {
    // this.pinecone = new Pinecone();
    this.openAIApiKey = args.openAIApiKey;
    this.pineconeIndex = args.pineconeIndex;
    this.leadId = args.leadId;
    this.maxTokens = args.maxTokens || 4000;
    this.summaryModelName = args.summaryModelName || 'gpt-4o-mini';
    this.inputKey = 'input';
    this.outputKey = 'output';
    this.userId = args.userId;

    this.openai = new OpenAI({ apiKey: this.openAIApiKey });
    this.vectorIndex = null;

    this.initializePinecone();
  }

  async initializePinecone() {
    try {
      // this.vectorIndex = this.pinecone.Index(this.pineconeIndex);
      logger.info(`Initialized Pinecone for lead: ${this.leadId}`);
    } catch (error) {
      logger.error(`Error initializing Pinecone: ${error.message}`);
    }
  }

  async saveContext(inputValues, outputValues) {
    try {
      const input = this.prepareInputForMemory(inputValues);
      const output = this.prepareOutputForMemory(outputValues);

      logger.debug(
        `Saving context - Input: ${JSON.stringify(input)}, Output: ${JSON.stringify(output)}`,
      );

      // Save to database
      await messageService.saveMessage(
        this.leadId, 
        this.userId,
        input[this.inputKey], 
        output[this.outputKey],
        'new'
      );

      // if (this.vectorIndex) {
      //   // Save to vector store
      //   const embedding = await this.getEmbedding(`Human: ${input[this.inputKey]}\nAI: ${output[this.outputKey]}`);
      //   await this.vectorIndex.upsert([{
      //     id: `${this.leadId}-${Date.now()}`,
      //     values: embedding,
      //     metadata: {
      //       leadId: this.leadId,
      //       timestamp: new Date().toISOString(),
      //     },
      //   }]);
      // }

      logger.info(`Saved context for lead: ${this.leadId}`);
    } catch (error) {
      logger.error(`Error saving context: ${error.message}`);
      logger.error(
        `Input: ${JSON.stringify(inputValues)}, Output: ${JSON.stringify(outputValues)}`,
      );
    }
  }

  // Метод для очистки текста
  cleanText(text) {
    // Удаляем лишние пробелы, переносы строк и т.д.
    return text.trim().replace(/\s+/g, ' ');
  }

  prepareInputForMemory(values) {
    if (typeof values === 'string') {
      return { [this.inputKey]: values };
    }
    if (values && typeof values === 'object' && this.inputKey in values) {
      const inputValue = values[this.inputKey];
      return {
        [this.inputKey]:
          typeof inputValue === 'string'
            ? inputValue
            : JSON.stringify(inputValue),
      };
    }
    return { [this.inputKey]: JSON.stringify(values) };
  }

  prepareOutputForMemory(values) {
    if (typeof values === 'string') {
      return { [this.outputKey]: values };
    }
    if (values && typeof values === 'object' && this.outputKey in values) {
      const outputValue = values[this.outputKey];
      return {
        [this.outputKey]:
          typeof outputValue === 'string'
            ? outputValue
            : JSON.stringify(outputValue),
      };
    }
    return { [this.outputKey]: JSON.stringify(values) };
  }

  async loadMemoryVariables(values = {}) {
    try {
      let history = [];
      let summary = '';
      let vectorHistory = [];

      const inputForMemory = this.prepareInputForMemory(values);

      // Get recent messages from database
      const recentMessages = await messageService.getRecentMessages(this.leadId, 10);
      let totalTokens = 0;

      for (const message of recentMessages.reverse()) {
        const messageTokens = countTokens(message.userRequest) + countTokens(message.assistantResponse);
        if (totalTokens + messageTokens > this.maxTokens) {
          break;
        }
        history.push({ role: 'user', content: message.userRequest });
        history.push({ role: 'assistant', content: message.assistantResponse });
        totalTokens += messageTokens;
      }

      // if (this.vectorIndex) {
      //   const embedding = await this.getEmbedding(inputForMemory[this.inputKey]);
      //   const queryResponse = await this.vectorIndex.query({
      //     vector: embedding,
      //     topK: 5,
      //     includeMetadata: true,
      //   });
      //   vectorHistory = queryResponse.matches.map(match => match.metadata);
      // }

      // Get all messages beyond the recent 10
      const allMessages = await messageService.getAllMessages(this.leadId);
      const messagesToSummarize = allMessages.slice(10);

      if (messagesToSummarize.length > 0) {
        summary = await this.summarizeHistory(messagesToSummarize);
      }

      // Limit summary to 2000 tokens
      if (countTokens(summary) > 2000) {
        summary = await this.truncateSummary(summary, 2000);
      }
      return { history, summary, vectorHistory };
    } catch (error) {
      logger.error(`Error loading memory variables: ${error.message}`);
      return { history: [], summary: '', vectorHistory: [] };
    }
  }

  async summarizeHistory(messagesToSummarize) {
    const messages = [
      { role: 'system', content: 'Summarize the following conversation history in a concise manner, capturing the main points and context. Use language of the last message. Keep your summary under 2000 tokens:' },
      { role: 'user', content: messagesToSummarize.map(m => `Human: ${m.userRequest}\nAI: ${m.assistantResponse}`).join('\n\n') }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.summaryModelName,
        messages: messages,
        temperature: 0,
        max_tokens: 2000,
      });

      const summary = response.choices[0].message.content;
      logger.info(`Generated summary for lead: ${this.leadId}`);
      return summary;
    } catch (error) {
      logger.error(`Error summarizing history: ${error.message}`);
      return 'Error generating summary.';
    }
  }

  async truncateSummary(summary, maxTokens) {
    const tokens = countTokens(summary);
    if (tokens <= maxTokens) {
      return summary;
    }

    // Простое обрезание по токенам
    const truncated = summary.split(' ').reduce((acc, word) => {
      if (countTokens(`${acc} ${word}`) <= maxTokens) {
        return `${acc} ${word}`;
      }
      return acc;
    }, '');

    logger.info(
      `Truncated summary from ${tokens} to ${countTokens(truncated)} tokens`,
    );
    return `${truncated}...`;
  }

  async getEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }
}

module.exports = EnhancedMemory;
