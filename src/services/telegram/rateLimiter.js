// src/services/telegram/rateLimiter.js

const logger = require('../../utils/logger');

class RateLimiter {
  constructor() {
    this.lastRequestTime = {};
    this.minInterval = 2000; // Минимальный интервал между запросами (2 секунды)
  }

  async limit(key) {
    const now = Date.now();
    if (this.lastRequestTime[key]) {
      const elapsed = now - this.lastRequestTime[key];
      if (elapsed < this.minInterval) {
        const delay = this.minInterval - elapsed;
        logger.info(`Rate limiting: Waiting for ${delay}ms before next request for ${key}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    this.lastRequestTime[key] = Date.now();
  }
}

module.exports = new RateLimiter();