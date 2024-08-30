  // src/db/repositories/campaignsMailingRepo.js

  const prisma = require('../utils/prisma');
  const logger = require('../../utils/logger');
  const { getUserByTgId } = require('./userRepo');

  async function createCampaignMailing(telegramId, name) {
    try {
      // Ищем пользователя по telegram_id
      const user = await getUserByTgId(telegramId);
      if (!user) {
        throw new Error(`User with Telegram ID ${telegramId} not found`);
      }

      return await prisma.campaignMailing.create({
        data: { userId: user.id, name }
      });
    } catch (error) {
      logger.error('Error creating campaign mailing:', error);
      throw error;
    }
  }

  async function setCampaignPrompt(id, promptId) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { promptId, updatedAt: new Date() }
      });
      logger.info(`Prompt set for campaign: ${campaignId}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error setting prompt for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async function getActiveCampaignForPhoneNumber(phoneNumber) {
    try {
      return await prisma.campaignMailing.findFirst({
        where: {
          isActive: true,
          phoneNumbers: {
            some: {
              phoneNumber: phoneNumber
            }
          }
        },
        include: {
          phoneNumbers: true,
          prompt: true
        }
      });
    } catch (error) {
      logger.error('Error getting active campaign for phone number:', error);
      throw error;
    }
  }

  async function setCampaignMessage(id, message) {
    try {
      return await prisma.campaignMailing.update({
        where: { id },
        data: { message, updatedAt: new Date() }
      });
    } catch (error) {
      logger.error('Error setting campaign message:', error);
      throw error;
    }
  }

  async function getCampaignMailing(id) {
    try {
      return await prisma.campaignMailing.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Error getting campaign mailing:', error);
      throw error;
    }
  }

  async function getCampaignMailingByName(name) {
    try {
      return await prisma.campaignMailing.findUnique({
        where: { name }
      });
    } catch (error) {
      logger.error('Error getting campaign mailing by name:', error);
      throw error;
    }
  }

  async function listCampaignMailings(telegramId) {
    const user = await getUserByTgId(telegramId);
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    try {
      return await prisma.campaignMailing.findMany({
        where: { userId: user.id }
      });
    } catch (error) {
      logger.error('Error listing campaign mailings:', error);
      throw error;
    }
  }

  async function getActiveCampaign(telegramId) {
    const user = await getUserByTgId(telegramId);
    if (!user) {
      throw new Error(`User with Telegram ID ${telegramId} not found`);
    }
    try {
      return await prisma.campaignMailing.findFirst({
        where: { userId: user.id, isActive: true }
      });
    } catch (error) {
      logger.error('Error getting active campaign:', error);
      throw error;
    }
  }

  async function setPlatformPriority(id, platformPriority) {
    try {
      return await prisma.campaignMailing.update({
        where: { id },
        data: { platformPriority, updatedAt: new Date() }
      });
    } catch (error) {
      logger.error('Error setting platform priority:', error);
      throw error;
    }
  }

  async function getPlatformPriority(id) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({
        where: { id },
        select: { platformPriority: true }
      });
      return campaign.platformPriority;
    } catch (error) {
      logger.error('Error getting platform priority:', error);
      throw error;
    }
  }

  async function attachPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      const phoneNumberRecord = await prisma.phoneNumber.findUnique({
        where: { phoneNumber },
        include: { telegramAccount: true, whatsappAccount: true }
      });

      if (!phoneNumberRecord) {
        throw new Error('Phone number does not exist');
      }

      if (platform === 'telegram' && !phoneNumberRecord.telegramAccount?.isAuthenticated) {
        throw new Error('Phone number is not Telegram authenticated');
      }

      if (platform === 'whatsapp' && !phoneNumberRecord.whatsappAccount?.isAuthenticated) {
        throw new Error('Phone number is not WhatsApp authenticated');
      }

      // Проверяем, не прикреплен ли уже этот номер к другой активной кампании
      const existingAttachment = await prisma.phoneNumberCampaign.findFirst({
        where: {
          phoneNumber,
          campaign: { isActive: true }
        }
      });

      if (existingAttachment) {
        throw new Error('Phone number is already attached to an active campaign');
      }

      return await prisma.phoneNumberCampaign.create({
        data: {
          campaignId,
          phoneNumber,
          platform
        }
      });
    } catch (error) {
      logger.error('Error attaching phone number to campaign:', error);
      throw error;
    }
  }

  async function detachPhoneNumber(campaignId, phoneNumber, platform) {
    try {
      return await prisma.phoneNumberCampaign.delete({
        where: {
          phoneNumber_campaignId: {
            phoneNumber,
            campaignId,
            platform,
          }
        }
      });
    } catch (error) {
      logger.error('Error detaching phone number from campaign:', error);
      throw error;
    }
  }

  async function getCampaignPhoneNumbers(campaignId) {
    try {
      logger.info(`Attempting to get phone numbers for campaign ${campaignId}`);
      
      if (!prisma.phoneNumberCampaign) {
        logger.error('prisma.phoneNumberCampaign is undefined');
        throw new Error('Invalid Prisma configuration: PhoneNumberCampaign model not found');
      }
      
      if (typeof prisma.phoneNumberCampaign.findMany !== 'function') {
        logger.error('prisma.phoneNumberCampaign.findMany is not a function');
        throw new Error('Invalid Prisma configuration: findMany method not found');
      }
      
      const result = await prisma.phoneNumberCampaign.findMany({
        where: { campaignId },
        include: {
          campaign: true
        }
      });
      
      logger.info(`Retrieved ${result.length} phone numbers for campaign ${campaignId}`);
      return result;
    } catch (error) {
      logger.error(`Error getting campaign phone numbers for campaign ${campaignId}:`, error.message);
      throw error;
    }
  }


  async function getCampaigUserId(campaignId) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      return campaign.userId;
    } catch (error) {
      logger.error(`Error getting user ID for campaign ${campaignId}:`, error.message);
      throw error;
    }
  }

  async function toggleCampaignActivity(id, isActive) {
    try {
      const phoneNumbers = await getCampaignPhoneNumbers(id);
      if (phoneNumbers.length === 0 && isActive) {
        throw new Error('Cannot activate campaign without attached phone numbers');
      }

      // await checkPhoneNumbersAuthentication(phoneNumbers);

      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { isActive, updatedAt: new Date() }
      });

      logger.info(`Campaign ${id} activity toggled to ${isActive}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error toggling campaign activity for campaign ${id}:`, error.message);
      throw error;
    }
  }

  async function checkPhoneNumbersAuthentication(phoneNumbers) {
    const unauthenticatedNumbers = phoneNumbers.filter(pn => {
      if (pn.platform === 'telegram' && !pn.phoneNumber.telegramAccount?.isAuthenticated) {
        return true;
      }
      if (pn.platform === 'whatsapp' && !pn.phoneNumber.whatsappAccount?.isAuthenticated) {
        return true;
      }
      return false;
    });

    if (unauthenticatedNumbers.length > 0) {
      throw new Error('Cannot activate campaign with unauthenticated phone numbers');
    }
  }


  module.exports = {
    createCampaignMailing,
    setCampaignMessage,
    getCampaignMailing,
    getCampaignMailingByName,
    listCampaignMailings,
    getActiveCampaign,
    setPlatformPriority,
    getPlatformPriority,
    attachPhoneNumber,
    detachPhoneNumber,
    getCampaignPhoneNumbers,
    toggleCampaignActivity,
    getCampaigUserId,
    setCampaignPrompt,
    getActiveCampaignForPhoneNumber
  };