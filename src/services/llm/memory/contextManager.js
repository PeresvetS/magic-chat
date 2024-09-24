// src/services/llm/memory/ContextManager.js

class ContextManager {
  constructor() {
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