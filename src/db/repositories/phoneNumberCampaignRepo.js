// src/db/repositories/phoneNumberCampaignRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

const phoneNumberCampaignRepo = {
  async findExistingAttachment(phoneNumber, excludeCampaignId) {
    try {
      return await prisma.phoneNumberCampaign.findFirst({
        where: {
          phoneNumber,
          NOT: {
            campaignId: excludeCampaignId,
          },
        },
      });
    } catch (error) {
      logger.error('Error finding existing phone number attachment:', error);
      throw error;
    }
  },

  async findAttachmentsByCampaignAndPlatform(campaignId, platform) {
    try {
      return await prisma.phoneNumberCampaign.findMany({
        where: {
          campaignId,
          platform,
        },
      });
    } catch (error) {
      logger.error('Error finding phone number campaign attachments:', error);
      throw error;
    }
  },

  async getPhoneNumberRecord(phoneNumber) {
    try {
      return await prisma.phoneNumber.findUnique({
        where: { phoneNumber },
        include: { telegramAccount: true, whatsappAccount: true },
      });
    } catch (error) {
      logger.error('Error getting phone number record:', error);
      throw error;
    }
  },

  async createAttachment(campaignId, phoneNumber, platform) {
    try {
      return await prisma.phoneNumberCampaign.create({
        data: {
          campaignId,
          phoneNumber,
          platform,
        },
      });
    } catch (error) {
      logger.error('Error creating phone number campaign attachment:', error);
      throw error;
    }
  },

  async deleteAttachment(campaignId, phoneNumber) {
    try {
      return await prisma.phoneNumberCampaign.deleteMany({
        where: {
          campaignId,
          phoneNumber,
        },
      });
    } catch (error) {
      logger.error('Error deleting phone number campaign attachment:', error);
      throw error;
    }
  },
};

module.exports = phoneNumberCampaignRepo;
