// src/utils/requestParsers.js

// Функция для безопасного парсинга JSON
const safeJSONParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
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
  
  // Функция для безопасного логирования объектов
  const safeStringify = (obj) => {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    }, 2);
  };
  

module.exports = {
  safeJSONParse,
  parsePHPSerialized,
  safeStringify
};