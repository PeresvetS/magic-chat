// src/utils/helpers.js

const logger = require('./logger');

function splitIntoSentences(text) {
  return text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Функция для безопасного логирования объектов с поддержкой BigInt
const safeStringify = (obj) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  }, 2);
};

const safeJSONParse = (str) => {
  try {
    return JSON.parse(str, (key, value) => {
      if (typeof value === 'string' && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }
      return value;
    });
  } catch (error) {
    logger.error('Error parsing JSON', { error: error.message, str });
    return null;
  }
};

// Функция для парсинга PHP-сериализованных данных
const parsePHPSerialized = (data) => {
  if (typeof data !== 'string') return data;
  
  // Простой парсер для PHP-сериализованных данных
  const parseValue = (str, startIndex) => {
    const type = str[startIndex];
    switch(type) {
      case 's':
        const colonIndex = str.indexOf(':', startIndex + 2);
        const length = parseInt(str.slice(startIndex + 2, colonIndex), 10);
        return str.slice(colonIndex + 2, colonIndex + 2 + length);
      case 'i':
        const semiIndex = str.indexOf(';', startIndex + 2);
        return parseInt(str.slice(startIndex + 2, semiIndex), 10);
      default:
        return null;
    }
  };

  const result = {};
  let index = 0;
  while (index < data.length) {
    if (data[index] === 'a') {
      // Начало массива
      const colonIndex = data.indexOf(':', index + 2);
      const length = parseInt(data.slice(index + 2, colonIndex), 10);
      index = colonIndex + 1;
      for (let i = 0; i < length; i++) {
        const key = parseValue(data, index);
        index = data.indexOf(';', index) + 1;
        const value = parseValue(data, index);
        index = data.indexOf(';', index) + 1;
        if (key !== null && value !== null) {
          result[key] = value;
        }
      }
      break;
    }
    index++;
  }
  return result;
};

function stringifyWithBigInt(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() + 'n' : value
  );
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  splitIntoSentences,
  delay,
  safeStringify,
  safeJSONParse,
  parsePHPSerialized, 
  stringifyWithBigInt,
  chunkArray
};