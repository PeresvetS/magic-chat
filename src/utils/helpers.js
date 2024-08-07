// src/utils/helpers.js

function splitIntoSentences(text) {
  return text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  splitIntoSentences,
  delay
};