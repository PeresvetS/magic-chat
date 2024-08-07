// src/services/parsing/userParser/parsingManager.js

const logger = require('../../../utils/logger');
const { checkLimit } = require('../../user/limitService');

class ParsingManager {
  constructor(groupParser) {
    this.groupParser = groupParser;
    this.parsingStatus = new Map();
  }

  async startParsing(userId, groupUsername, audienceDescription) {
    try {
      const canParse = await checkLimit(userId, 'parsing');
      if (!canParse) {
        throw new Error('Parsing limit exceeded');
      }

      this.parsingStatus.set(userId, { status: 'active', group: groupUsername, startTime: new Date() });
      
      const result = await this.groupParser.parseGroup(groupUsername, audienceDescription);
      logger.info(`Started parsing for user ${userId}, group ${groupUsername}`);
      
      this.parsingStatus.set(userId, { status: 'completed', group: groupUsername, endTime: new Date() });
      
      return result;
    } catch (error) {
      if (error.message === 'Parsing was cancelled') {
        this.parsingStatus.set(userId, { status: 'stopped', group: groupUsername, endTime: new Date() });
        logger.info(`Parsing was stopped for user ${userId}, group ${groupUsername}`);
      } else {
        this.parsingStatus.set(userId, { status: 'error', group: groupUsername, error: error.message });
        logger.error('Error starting parsing:', error);
      }
      throw error;
    }
  }

  async stopParsing(userId) {
    const status = this.parsingStatus.get(userId);
    if (status && status.status === 'active') {
      this.groupParser.cancelParsing();
      this.parsingStatus.set(userId, { ...status, status: 'stopping' });
      logger.info(`Stopping parsing for user ${userId}`);
    } else {
      logger.warn(`No active parsing found for user ${userId}`);
    }
  }

  getParsingStatus(userId) {
    const status = this.parsingStatus.get(userId);
    if (!status) {
      return 'Нет активного парсинга';
    }

    let statusMessage = `Статус парсинга: ${status.status}`;
    if (status.group) {
      statusMessage += `, группа: ${status.group}`;
    }
    if (status.startTime) {
      statusMessage += `, начало: ${status.startTime.toISOString()}`;
    }
    if (status.endTime) {
      statusMessage += `, окончание: ${status.endTime.toISOString()}`;
    }
    if (status.error) {
      statusMessage += `, ошибка: ${status.error}`;
    }

    return statusMessage;
  }
}

module.exports = ParsingManager;