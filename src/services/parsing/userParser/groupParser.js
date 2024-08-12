// src/services/userParser/groupParser.js

const { client } = require('../../main');
const { getPhoneNumber } = require('../../db');
const logger = require('../../utils/logger');

class GroupParser {
  constructor(userParser) {
    this.userParser = userParser;
    this.isParsingCancelled = false;
  }

  cancelParsing() {
    this.isParsingCancelled = true;
  }

  resetCancelFlag() {
    this.isParsingCancelled = false;
  }

  async parseGroup(groupUsername, audienceDescription) {
    try {
      this.resetCancelFlag();
      const phoneNumber = await getPhoneNumber();
      if (!phoneNumber) {
        throw new Error('Phone number not set');
      }

      const group = await this.getGroup(groupUsername);
      const participants = await this.getParticipants(group.fullChat.id);
      
      if (this.isParsingCancelled) {
        throw new Error('Parsing was cancelled');
      }

      const categorizedUsers = await this.userParser.categorizeUsers(participants, audienceDescription);
      
      if (this.isParsingCancelled) {
        throw new Error('Parsing was cancelled');
      }

      return categorizedUsers;
    } catch (error) {
      logger.error('Error parsing group:', error);
      throw error;
    }
  }

  async getGroup(groupUsername) {
    return client.invoke(new client.Api.channels.GetFullChannel({
      channel: groupUsername
    }));
  }

  async getParticipants(channelId, maxUsers = 0) {
    let participants = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      if (this.isParsingCancelled) {
        throw new Error('Parsing was cancelled');
      }

      const chunk = await client.invoke(new client.Api.channels.GetParticipants({
        channel: channelId,
        filter: new client.Api.ChannelParticipantsRecent(),
        offset: offset,
        limit: limit,
        hash: 0
      }));

      participants = participants.concat(chunk.users);

      if (chunk.users.length < limit || (maxUsers > 0 && participants.length >= maxUsers)) {
        break;
      }

      offset += limit;
    }

    return maxUsers > 0 ? participants.slice(0, maxUsers) : participants;
  }
}

module.exports = GroupParser;