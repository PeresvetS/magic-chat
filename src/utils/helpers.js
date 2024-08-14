// src/utils/helpers.js

function splitIntoSentences(text) {
  return text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  });
}

module.exports = {
  splitIntoSentences,
  delay,
  safeStringify
};