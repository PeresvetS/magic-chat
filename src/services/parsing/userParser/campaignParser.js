// src/services/userParser/campaignParser.js

const { updateCampaignStatus, updateCampaignStats, saveParsedUsers } = require('../../../db');
const logger = require('../../../utils/logger');

class CampaignParser {
  constructor(userParser) {
    this.userParser = userParser;
  }

  async parseCampaign(campaignId, groups, audienceDescription, maxUsers, depth) {
    try {
      await updateCampaignStatus(campaignId, 'in_progress');

      const results = {};
      let totalParsed = 0;

      for (const groupUsername of groups) {
        const group = await this.userParser.groupParser.getGroup(groupUsername);
        const participants = await this.userParser.groupParser.getParticipants(group.fullChat.id, maxUsers);
        const categorizedUsers = await this.userParser.categorizeUsers(participants, audienceDescription, depth);
        
        await saveParsedUsers(campaignId, groupUsername, categorizedUsers, group.fullChat.about);
        
        results[groupUsername] = categorizedUsers;
        totalParsed += Object.values(categorizedUsers).flat().length;

        if (maxUsers > 0 && totalParsed >= maxUsers) break;
      }

      await updateCampaignStats(campaignId, totalParsed, 0);
      await updateCampaignStatus(campaignId, 'completed');
      return results;
    } catch (error) {
      logger.error(`Error parsing campaign ${campaignId}:`, error);
      await updateCampaignStatus(campaignId, 'failed');
      throw error;
    }
  }
}

module.exports = CampaignParser;