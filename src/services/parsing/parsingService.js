// src/services/parsing/parsingService.js

const BioEvaluator = require('./userParser/bioEvaluator');
const CampaignParser = require('./userParser/campaignParser');
const GroupParser = require('./userParser/groupParser');
const UserCategorizer = require('./userParser/userCategorizer');
const ParsingManager = require('./userParser/parsingManager');

class ParsingService {
  constructor() {
    this.bioEvaluator = new BioEvaluator();
    this.groupParser = new GroupParser();
    this.campaignParser = new CampaignParser();
    this.userCategorizer = new UserCategorizer();
    this.parsingManager = new ParsingManager(this.groupParser);
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
}

module.exports = new ParsingService();