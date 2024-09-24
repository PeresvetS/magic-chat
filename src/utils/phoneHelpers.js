// src/utils/phoneHelpers.js

const logger = require('./logger');

function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^\+[1-9]\d{5,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    logger.warn(`Invalid phone number format: ${phoneNumber}`);
    throw new Error(
      'Неверный формат номера телефона. Используйте международный формат, начиная с +',
    );
  }
}

function formatPhoneNumberForWhatsApp(phoneNumber) {
  // Удаляем все нецифровые символы
  const cleaned = phoneNumber.replace(/\D/g, '');
  // Добавляем "@c.us" в конец номера
  return `${cleaned}@c.us`;
}

function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return null;
  }

  // Преобразуем входное значение в строку
  const phoneString = String(phoneNumber);

  // Удаляем все нецифровые символы
  let cleaned = phoneString.replace(/\D/g, '');

  // Если номер начинается с '8' и длина 11 цифр (российский номер), заменяем '8' на '7'
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = `7${cleaned.slice(1)}`;
  }

  // Если номер не начинается с '+', добавляем его
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

async function applyDelay(platform) {
  let minDelay;
  let maxDelay;

  if (platform === 'telegram') {
    minDelay = 10000; // 10 seconds
    maxDelay = 60000; // 1 minute
  } else if (platform === 'whatsapp') {
    minDelay = 30000; // 30 seconds
    maxDelay = 300000; // 5 minutes
  } else {
    // Если платформа неизвестна, используем минимальную задержку
    minDelay = 10000;
    maxDelay = 10000;
  }

  const delay = Math.floor(
    Math.random() * (maxDelay - minDelay + 1) + minDelay,
  );
  logger.info(`Applying delay of ${delay}ms for ${platform} platform`);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

module.exports = {
  validatePhoneNumber,
  formatPhoneNumberForWhatsApp,
  formatPhoneNumber,
  applyDelay,
};
