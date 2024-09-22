// src/db/repositories/leadProfileRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function getOrCreateLeadProfile(leadId) {
  try {
    let profile = await prisma.leadProfile.findUnique({
      where: { leadId },
    });

    if (!profile) {
      profile = await prisma.leadProfile.create({
        data: { leadId },
      });
    }

    return profile;
  } catch (error) {
    logger.error('Error getting or creating lead profile:', error);
    throw error;
  }
}

async function updateLeadProfileField(leadId, field, value) {
  try {
    const profile = await getOrCreateLeadProfile(leadId);
    return await prisma.leadProfile.update({
      where: { id: profile.id },
      data: { [field]: value },
    });
  } catch (error) {
    logger.error(`Error updating lead profile field ${field}:`, error);
    throw error;
  }
}

module.exports = {
  getOrCreateLeadProfile,
  updateLeadProfileField,
};
