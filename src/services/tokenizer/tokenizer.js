// src/services/tokenizer/tokenizer.js

const GPT3Tokenizer = require('gpt3-tokenizer').default;

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

function countTokens(text) {
  const encoded = tokenizer.encode(text);
  return encoded.text.length;
}

function countTokensForMessages(messages) {
  return messages.reduce((total, message) => {
    return total + 4 + countTokens(message.role) + countTokens(message.content);
  }, 0);
}

module.exports = { countTokens, countTokensForMessages };