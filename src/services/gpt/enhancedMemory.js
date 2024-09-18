// src/services/langchain/enhancedMemory.js

const { VectorStoreRetrieverMemory } = require("langchain/memory");
const { PineconeStore } = require("@langchain/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { Pinecone } = require("@pinecone-database/pinecone");
const { ConversationSummaryMemory } = require("langchain/memory");
const { ChatOpenAI } = require("@langchain/openai");
const { countTokens } = require('../tokenizer/tokenizer');
const { conversationStateRepo } = require('../../db');
const { ChatMessageHistory } = require("langchain/stores/message/in_memory");
const { safeStringify } = require('../../utils/helpers');
const logger = require('../../utils/logger');
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");

class EnhancedMemory {
  constructor(args) {
    this.pinecone = new Pinecone();
    this.openAIApiKey = args.openAIApiKey;
    this.pineconeIndex = args.pineconeIndex;
    this.conversationId = args.conversationId; // ?
    this.maxTokens = args.maxTokens || 4000;
    this.summaryModelName = args.summaryModelName || "gpt-4o-mini";
    this.leadId = args.leadId;
    this.inputKey = 'input'; // Изменено на 'input'
    this.outputKey = 'output'; // Изменено на 'output'
    this.chatHistory = new ChatMessageHistory();
  
    this.vectorStoreMemory = null;
    this.summaryMemory = null;
  
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
        inputKey: this.inputKey,
        outputKey: this.outputKey,
        memoryKey: "history",
      });
  
      this.summaryMemory = new ConversationSummaryMemory({ // не в векторе
        llm: new ChatOpenAI({ 
          modelName: this.summaryModelName,
          openAIApiKey: this.openAIApiKey 
        }),
        chatHistory: this.chatHistory,
        memoryKey: "summary",
      });
  
      logger.info(`Initialized Pinecone for conversation: ${this.conversationId}`);
    } catch (error) {
      logger.error(`Error initializing Pinecone: ${error.message}`);
      // Не выбрасываем ошибку, чтобы класс мог работать без памяти
    }
  }
  

  async saveContext(inputValues, outputValues) {
    try {
      const input = this.prepareInputForMemory(inputValues);
      const output = this.prepareOutputForMemory(outputValues);

      logger.debug(`Saving context - Input: ${JSON.stringify(input)}, Output: ${JSON.stringify(output)}`);

      if (this.vectorStore) {
        // Сохраняем input с ролью 'human'
        await this.vectorStore.addDocuments([
          {
            pageContent: this.cleanText(input[this.inputKey]),
            metadata: { 
              role: 'human', 
              timestamp: new Date().toISOString(),
              conversationId: this.conversationId
            }
          }
        ]);

        // Сохраняем output с ролью 'ai'
        await this.vectorStore.addDocuments([
          {
            pageContent: this.cleanText(output[this.outputKey]),
            metadata: { 
              role: 'ai', 
              timestamp: new Date().toISOString(),
              conversationId: this.conversationId
            }
          }
        ]);
      }

      if (this.chatHistory) {
        await this.chatHistory.addUserMessage(input[this.inputKey]);
        await this.chatHistory.addAIChatMessage(output[this.outputKey]);
      }

      if (this.summaryMemory) {
        const summary = await this.summaryMemory.loadMemoryVariables(); 
        await this.saveConversationState(this.leadId, output[this.outputKey], summary.summary);
      }

      logger.info(`Saved context for conversation: ${this.conversationId}`);
    } catch (error) {
      logger.error(`Error saving context: ${error.message}`);
      logger.error(`Input: ${JSON.stringify(inputValues)}, Output: ${JSON.stringify(outputValues)}`);
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
      return { [this.inputKey]: typeof inputValue === 'string' ? inputValue : JSON.stringify(inputValue) };
    }
    return { [this.inputKey]: JSON.stringify(values) };
  }
  

  prepareOutputForMemory(values) {
    if (typeof values === 'string') {
      return { [this.outputKey]: values };
    }
    if (values && typeof values === 'object' && this.outputKey in values) {
      const outputValue = values[this.outputKey];
      return { [this.outputKey]: typeof outputValue === 'string' ? outputValue : JSON.stringify(outputValue) };
    }
    return { [this.outputKey]: JSON.stringify(values) };
  }

  async saveConversationState(leadId, output, summary) {
    try {
      await conversationStateRepo.saveConversationState(leadId, output, summary);
      logger.info('Conversation state saved successfully');
    } catch (error) {
      logger.error('Error saving conversation state:', error);
    }
  }
  

  async loadMemoryVariables(values = {}) {
    try {
      let history = [];
      let summary = "";

      logger.info(`Loading memory values: ${safeStringify(values)}`);

      const inputForMemory = this.prepareInputForMemory(values);

      if (this.vectorStoreMemory) {
        const vectorStoreResult = await this.vectorStoreMemory.loadMemoryVariables(inputForMemory);
        let historyArray = [];
        
        if (typeof vectorStoreResult.history === 'string') {
          // Если история - строка, разбиваем ее на отдельные сообщения
          historyArray = vectorStoreResult.history.split('\n').filter(msg => msg.trim() !== '');
        } else if (Array.isArray(vectorStoreResult.history)) {
          historyArray = vectorStoreResult.history;
        }

        // Преобразуем строки в объекты сообщений
        history = historyArray.map(msg => {
          const [role, content] = msg.split(': ', 2);
          if (role.toLowerCase() === 'human') {
            return new HumanMessage(content);
          } else if (role.toLowerCase() === 'ai') {
            return new AIMessage(content);
          }
          // Если роль не определена, считаем сообщение пользовательским
          return new HumanMessage(msg);
        });

        if (history.length > 10) {
          // Берем последние 10 элементов для истории
          const recentHistory = history.slice(-10);
          
          // Суммаризируем остальные элементы
          const toSummarize = history.slice(0, -10);
          summary = await this.summarizeHistory(toSummarize);
          
          history = recentHistory;
        }

        logger.info(`Loaded in vectorStoreMemory history: ${safeStringify(history)}`);
        logger.info(`Generated summary: ${safeStringify(summary)}`);
      }

      if (this.summaryMemory) {
        const summaryResult = await this.summaryMemory.loadMemoryVariables(inputForMemory);
        if (!summary) {
          summary = summaryResult.summary || "";
        }
        logger.info(`Loaded in summaryMemory summary: ${safeStringify(summary)}`);
      }

      // Ограничиваем размер summary до 2000 токенов
      if (countTokens(summary) > 2000) {
        summary = await this.truncateSummary(summary, 2000);
      }

      let summaryTokens = countTokens(summary);
      let historyTokens = countTokens(JSON.stringify(history));

      logger.info(`Summary tokens: ${summaryTokens}`);
      logger.info(`History tokens: ${historyTokens}`);

      logger.info(`Loaded memory variables for conversation: ${this.conversationId}`);
      return { history, summary };
    } catch (error) {
      logger.error(`Error loading memory variables: ${error.message}`);
      return { history: [], summary: "" };
    }
  }

  async summarizeHistory(historyToSummarize) {
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
      maxTokens: 2000
    });

    const summarizePrompt = ChatPromptTemplate.fromTemplate(
      "Summarize the following conversation history in a concise manner, capturing the main points and context. Keep your summary under 2000 tokens:\n\n{history}"
    );

    const chain = summarizePrompt.pipe(llm).pipe(new StringOutputParser());

    const history = Array.isArray(historyToSummarize) 
      ? historyToSummarize.map(m => `${m.role}: ${m.content}`).join('\n')
      : historyToSummarize;

    try {
      const summary = await chain.invoke({ history });
      logger.info(`Generated summary: ${summary}`);
      return summary;
    } catch (error) {
      logger.error(`Error summarizing history: ${error.message}`);
      return "Error generating summary.";
    }
  }

  async truncateSummary(summary, maxTokens) {
    const tokens = countTokens(summary);
    if (tokens <= maxTokens) {
      return summary;
    }
    
    // Простое обрезание по токенам
    const truncated = summary.split(' ').reduce((acc, word) => {
      if (countTokens(acc + ' ' + word) <= maxTokens) {
        return acc + ' ' + word;
      }
      return acc;
    }, '');

    logger.info(`Truncated summary from ${tokens} to ${countTokens(truncated)} tokens`);
    return truncated + '...';
  }

  async getContextString(userMessage) {
    try {
      let contextString = `Human: ${userMessage}\nAI:`;
      const { history, summary } = await this.loadMemoryVariables({ [this.inputKey]: userMessage });
      const historyString = Array.isArray(history) 
        ? history.map(m => `${m.role}: ${m.content}`).join('\n')
        : '';

      if (historyString !== '') {
        contextString = `Recent conversation:\n${historyString}\n\n` + contextString;
      } 

      if (summary !== '') {
        contextString = `Summary: ${summary}\n\n` + contextString;
      }

      logger.info(`Generated context string for conversation: ${this.conversationId}`);
      return contextString;
    } catch (error) {
      logger.error(`Error getting context string: ${error.message}`);
      return { contextString: `Human: ${userMessage}\nAI:`, memoryVariables: {} };
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