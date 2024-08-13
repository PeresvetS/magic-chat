const { ConversationSummaryMemory } = require("langchain/memory");
const { OpenAI } = require("langchain/llms/openai");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { HumanMessage, AIMessage } = require("langchain/schema");
const config = require('../../../config');

class ContextManager {
  constructor() {
    const model = new OpenAI({ temperature: 0, modelName: "gpt-4-mini", openAIApiKey: config.OPENAI_API_KEY });
    this.memory = new ConversationSummaryMemory({
      memoryKey: "chat_history",
      llm: model,
      maxTokenLimit: 1000  // Adjust this value as needed
    });
    this.chatHistory = [];
  }

  async addMessage(role, content) {
    if (role === 'human') {
      this.chatHistory.push(new HumanMessage(content));
    } else if (role === 'ai') {
      this.chatHistory.push(new AIMessage(content));
    }

    // Keep only the last 10 messages in the chat history
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
    return [...(history ? [new AIMessage(history)] : []), ...this.chatHistory];
  }
}

module.exports = ContextManager;