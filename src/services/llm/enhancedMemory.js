// src/services/llm/enhancedMemory.js

const { VectorStoreRetrieverMemory } = require('langchain/memory');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { ConversationSummaryMemory } = require('langchain/memory');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatMessageHistory } = require('langchain/stores/message/in_memory');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');

const { countTokens } = require('../tokenizer/tokenizer');
const messageService = require('../dialog/messageService');
const { safeStringify } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class EnhancedMemory {
  constructor(args) {
    this.pinecone = new Pinecone();
    this.openAIApiKey = args.openAIApiKey;
    this.pineconeIndex = args.pineconeIndex;
    this.leadId = args.leadId;
    this.maxTokens = args.maxTokens || 4000;
    this.summaryModelName = args.summaryModelName || 'gpt-4o-mini';
    this.inputKey = 'input';
    this.outputKey = 'output';
    this.chatHistory = new ChatMessageHistory();
    this.userId = args.userId;

    this.vectorStoreMemory = null;
    this.summaryMemory = null;

    this.initializePinecone();
  }

  async initializePinecone() {
    try {
      const pineconeIndex = this.pinecone.Index(this.pineconeIndex);

      this.vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({ openAIApiKey: this.openAIApiKey }),
        { pineconeIndex },
      );

      this.vectorStoreMemory = new VectorStoreRetrieverMemory({
        vectorStoreRetriever: this.vectorStore.asRetriever(),
        inputKey: this.inputKey,
        outputKey: this.outputKey,
        memoryKey: 'history',
      });

      this.summaryMemory = new ConversationSummaryMemory({
        llm: new ChatOpenAI({
          modelName: this.summaryModelName,
          openAIApiKey: this.openAIApiKey,
        }),
        chatHistory: this.chatHistory,
        memoryKey: 'summary',
      });

      logger.info(
        `Initialized Pinecone for lead: ${this.leadId}`,
      );
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
        input[this.inputKey], 
        output[this.outputKey],
        this.userId // Добавьте это
      );

      if (this.vectorStore) {
        // Save to vector store
        await this.vectorStore.addDocuments([
          {
            pageContent: this.cleanText(`Human: ${input[this.inputKey]}\nAI: ${output[this.outputKey]}`),
            metadata: {
              leadId: this.leadId,
              timestamp: new Date().toISOString(),
            },
          },
        ]);
      }

      if (this.chatHistory) {
        await this.chatHistory.addUserMessage(input[this.inputKey]);
        await this.chatHistory.addAIChatMessage(output[this.outputKey]);
      }

      if (this.summaryMemory) {
        await this.summaryMemory.saveContext(input, output);
      }

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

  async saveConversationState(leadId, output, summary) {
    try {
      await conversationStateRepo.saveConversationState(
        leadId,
        output,
        summary,
      );
      logger.info('Conversation state saved successfully');
    } catch (error) {
      logger.error('Error saving conversation state:', error);
    }
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

      logger.info(`Recent messages: ${safeStringify(recentMessages)}`);

      for (const message of recentMessages.reverse()) {
        const messageTokens = countTokens(message.userRequest) + countTokens(message.assistantResponse);
        if (totalTokens + messageTokens > this.maxTokens) {
          break;
        }
        history.push(new HumanMessage(message.userRequest));
        history.push(new AIMessage(message.assistantResponse));
        totalTokens += messageTokens;
      }

      logger.info(`History: ${safeStringify(history)}`);

      if (this.vectorStoreMemory) {
        const vectorStoreResult = await this.vectorStoreMemory.loadMemoryVariables(inputForMemory);
        vectorHistory = vectorStoreResult.history || [];
      }

      if (this.summaryMemory) {
        const summaryResult = await this.summaryMemory.loadMemoryVariables(inputForMemory);
        summary = summaryResult.summary || '';
      }

      // If we have more messages than fit in the token limit, summarize the rest
      if (recentMessages.length > history.length / 2 || totalTokens >= this.maxTokens) {
        const messagesToSummarize = recentMessages.slice((history.length / 2));
        const additionalSummary = await this.summarizeHistory(messagesToSummarize);
        summary = `${additionalSummary}\n\n${summary}`.trim();
      }

      // Limit summary to 2000 tokens
      if (countTokens(summary) > 2000) {
        summary = await this.truncateSummary(summary, 2000);
      }

      logger.info(`Loaded memory variables for lead: ${this.leadId}`);
      return { history, summary, vectorHistory };
    } catch (error) {
      logger.error(`Error loading memory variables: ${error.message}`);
      return { history: [], summary: '', vectorHistory: [] };
    }
  }

  async summarizeHistory(messagesToSummarize) {
    const llm = new ChatOpenAI({
      modelName: this.summaryModelName,
      temperature: 0,
      maxTokens: 2000,
      openAIApiKey: this.openAIApiKey,
    });

    const summarizePrompt = ChatPromptTemplate.fromTemplate(
      'Summarize the following conversation history in a concise manner, capturing the main points and context. Keep your summary under 2000 tokens:\n\n{history}'
    );

    const chain = summarizePrompt.pipe(llm).pipe(new StringOutputParser());

    const history = messagesToSummarize
      .map(m => `Human: ${m.userRequest}\nAI: ${m.assistantResponse}`)
      .join('\n\n');

    try {
      const summary = await chain.invoke({ history });
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

  async getContextString(userMessage) {
    try {
      let contextString = `Human: ${userMessage}\nAI:`;
      const { history, summary, vectorHistory } = await this.loadMemoryVariables({
        [this.inputKey]: userMessage,
      });

      logger.info(`History: ${safeStringify(history)}`);
      logger.info(`Summary: ${safeStringify(summary)}`);
      logger.info(`Vector History: ${safeStringify(vectorHistory)}`);

      const historyString = Array.isArray(history)
        ? history.map((m) => `${m._getType()}: ${m.content}`).join('\n')
        : '';

      logger.info(`History String: ${safeStringify(historyString)}`);

      if (historyString !== '') {
        contextString = `Recent conversation:\n${historyString}\n\n${contextString}`;
      }

      if (summary !== '') {
        contextString = `Summary: ${summary}\n\n${contextString}`;
      }

      if (vectorHistory !== '') {
        contextString = `Relevant from vector store history: ${vectorHistory}\n\n${contextString}`;
      }

      logger.info(
        `Generated context string for conversation: ${this.conversationId}`,
      );
      return contextString;
    } catch (error) {
      logger.error(`Error getting context string: ${error.message}`);
      return `Human: ${userMessage}\nAI:`;
    }
  }
}

module.exports = EnhancedMemory;
