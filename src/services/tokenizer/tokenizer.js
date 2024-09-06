// src/services/tokenizer/tokenizer.js

const GPT3Tokenizer = require('gpt3-tokenizer').default;

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

// Определяем константу для магического числа
const BASE_TOKENS_PER_MESSAGE = 4;

function countTokens(text) {
  const encoded = tokenizer.encode(text);
  return encoded.text.length;
}

function countTokensForMessages(messages) {
  return messages.reduce(
    (total, message) =>
      total +
      BASE_TOKENS_PER_MESSAGE + // Используем константу вместо числа 4
      countTokens(message.role) +
      countTokens(message.content),
    0,
  );
}

module.exports = { countTokens, countTokensForMessages };
