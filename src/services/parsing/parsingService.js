// src/services/parsing/parsingService.js

const { getClient } = require('../auth/authService');
const logger = require('../../utils/logger');
const BioEvaluator = require('./userParser/bioEvaluator');
const UserCategorizer = require('./userParser/userCategorizer');
const ParsingManager = require('./userParser/parsingManager');
const CampaignParser = require('./userParser/campaignParser');

class ParsingService {
  constructor() {
    this.bioEvaluator = new BioEvaluator();
    this.userCategorizer = new UserCategorizer(this.bioEvaluator);
    this.parsingManager = new ParsingManager(this);
    this.campaignParser = new CampaignParser(this);
  }

  async startParsing(userId, groupUsername, audienceDescription) {
    return this.parsingManager.startParsing(userId, groupUsername, audienceDescription);
  }

  async stopParsing(userId) {
    return this.parsingManager.stopParsing(userId);
  }

  async getParsingStatus(userId) {
    return this.parsingManager.getParsingStatus(userId);
  }

  async parseCampaign(userId, campaignId, groups, audienceDescription, maxUsers, depth) {
    return this.campaignParser.parseCampaign(campaignId, groups, audienceDescription, maxUsers, depth);
  }

  async categorizeUsers(users, audienceDescription, depth) {
    return this.userCategorizer.categorizeUsers(users, audienceDescription, depth);
  }

  async evaluateBio(bio, audienceDescription) {
    return this.bioEvaluator.evaluateBio(bio, audienceDescription);
  }

  async parseGroup(groupUsername) {
    try {
      const client = getClient();
      const entity = await client.getEntity(groupUsername);
      const participants = await client.getParticipants(entity);
      logger.info(`Parsed ${participants.length} users from ${groupUsername}`);
      return participants;
    } catch (error) {
      logger.error('Error parsing group:', error);
      throw error;
    }
  }
}

module.exports = new ParsingService();