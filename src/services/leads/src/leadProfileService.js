// src/services/leads/src/leadProfileService.js

const { leadProfileRepo } = require('../../../db');
const logger = require('../../../utils/logger');

async function getOrCreateLeadProfile(leadId) {
  try {
    return await leadProfileRepo.getOrCreateLeadProfile(leadId);
  } catch (error) {
    logger.error('Error in getOrCreateLeadProfile service:', error);
    throw error;
  }
}

async function updateLeadProfileField(leadId, field, value) {
  try {
    return await leadProfileRepo.updateLeadProfileField(leadId, field, value);
  } catch (error) {
    logger.error(`Error in updateLeadProfileField service for ${field}:`, error);
    throw error;
  }
}

async function getLeadProfileInfo(leadId) {
  try {
    const profile = await leadProfileRepo.getOrCreateLeadProfile(leadId);
    
    if (!profile) {
      return '';
    }

    let info = '';

    if (profile.name) info += `Name: ${profile.name}\n`;
    if (profile.status) info += `Status: ${profile.status}\n`;
    if (profile.address) info += `Address: ${profile.address}\n`;
    if (profile.businessType) info += `Business Type: ${profile.businessType}\n`;
    if (profile.leadGenerationMethod) info += `Lead Generation Method: ${profile.leadGenerationMethod}\n`;
    if (profile.mainPains) info += `Main Pains: ${profile.mainPains}\n`;
    if (profile.location) info += `Location: ${profile.location}\n`;
    if (profile.interests) info += `Interests: ${profile.interests}\n`;

    if (info) {
      return `Lead Profile Information:\n${info}`;
    } else {
      return '';
    }
  } catch (error) {
    logger.error('Error in getLeadProfileInfo service:', error);
    return '';
  }
}

module.exports = {
  updateLeadProfileField,
  getOrCreateLeadProfile,
  getLeadProfileInfo,
};
