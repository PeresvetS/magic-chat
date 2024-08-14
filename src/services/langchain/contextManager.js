// src/services/langchain/contextManager.js

const { ConversationSummaryMemory } = require("langchain/memory");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const config = require('../../config');

class ContextManager {
  constructor() {
    const model = new ChatOpenAI({ 
      temperature: 0, 
      modelName: "gpt-4o-mini", // Убедитесь, что используете доступную вам модель
      openAIApiKey: config.OPENAI_API_KEY 
    });
    this.memory = new ConversationSummaryMemory({
      memoryKey: "chat_history",
      llm: new ChatOpenAI({ temperature: 0, modelName: "gpt-4o-mini" }),
      maxTokenLimit: 1000
    });
    this.chatHistory = [];
  }

  async addMessage(message) {
    this.chatHistory.push(message);
    if (this.chatHistory.length > 10) {
      const excessMessages = this.chatHistory.slice(0, -10);
      for (const msg of excessMessages) {
        await this.memory.saveContext(
          { input: msg.content },
          { output: "Summarized in chat history." }
        );
      }
      this.chatHistory = this.chatHistory.slice(-10);
    }
  }

  async getMessages() {
    const { history } = await this.memory.loadMemoryVariables({});
    return [
      ...(history ? [{ role: 'system', content: history }] : []),
      ...this.chatHistory
    ];
  }
}

module.exports = ContextManager;