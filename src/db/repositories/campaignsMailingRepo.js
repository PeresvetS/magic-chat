  // src/db/repositories/campaignsMailingRepo.js

  const prisma = require('../utils/prisma');
  const logger = require('../../utils/logger');
  const { getUserByTgId } = require('./userRepo');
  const { safeStringify } = require('../../utils/helpers');

  async function createCampaignMailing(telegramId, name) {
    try {
      const user = await getUserByTgId(telegramId);
      if (!user) {
        throw new Error(`User with Telegram ID ${telegramId} not found`);
      }
  
      return await prisma.campaignMailing.create({
        data: { userId: user.id, name }
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new Error(`Кампания с именем "${name}" уже существует. Пожалуйста, выберите другое имя.`);
      }
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

  async function setDefaultPhoneNumber(campaignId, phoneNumber) {
    try {
      await prisma.campaignMailing.update({
        where: { id: campaignId },
        data: { defaultPhoneNumber: phoneNumber }
      });
    } catch (error) {
      logger.error(`Error setting default phone number for campaign ${campaignId}:`, error);
      throw error;
    }
  }
  
  async function getDefaultPhoneNumber(campaignId) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({
        where: { id: campaignId },
        select: { defaultPhoneNumber: true }
      });
      return campaign?.defaultPhoneNumber;
    } catch (error) {
      logger.error(`Error getting default phone number for campaign ${campaignId}:`, error);
      throw error;
    }
  }
  
  async function getFirstAvailablePhoneNumber(campaignId) {
    try {
      const phoneNumbers = await prisma.phoneNumberCampaign.findMany({
        where: { 
          campaignId: campaignId,
        },
        include: {
          campaign: {
            include: {
              user: {
                include: {
                  phoneNumbers: true
                }
              }
            }
          }
        },
        orderBy: { addedAt: 'asc' }
      });
  
      const availablePhoneNumber = phoneNumbers.find(pnc => 
        pnc.campaign.user.phoneNumbers.some(pn => 
          pn.phoneNumber === pnc.phoneNumber && !pn.isBanned
        )
      );
  
      return availablePhoneNumber?.phoneNumber;
    } catch (error) {
      logger.error(`Error getting first available phone number for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  async function setGoogleSheetUrl(id, googleSheetUrl) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { googleSheetUrl, updatedAt: new Date() }
      });
      logger.info(`Google Sheet URL set for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error setting Google Sheet URL for campaign ${id}:`, error);
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

      logger.info(`Phone number record: ${safeStringify(phoneNumberRecord)}`);

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
          campaignId,
          campaign: { isActive: true }
        }
      });

      logger.info(`Existing attachment: ${safeStringify(existingAttachment)}`);

      if (existingAttachment) {
        throw new Error('Phone number is already attached to an active campaign');
      }

      logger.info(`Attaching phone number ${phoneNumber} to campaign ${campaignId} on platform ${platform}`);
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

  async function detachPhoneNumber(campaignId, phoneNumber) {
    try {
      const existingAttachment = await prisma.phoneNumberCampaign.findFirst({
        where: {
          campaignId,
          phoneNumber
        }
      });

      logger.info(`Existing attachment: ${safeStringify(existingAttachment)}`);
  
      if (!existingAttachment) {
        logger.warn(`No attachment found for campaignId: ${campaignId} and phoneNumber: ${phoneNumber}`);
        return null;
      }
  
      logger.info(`Detaching phone number ${phoneNumber} from campaign ${campaignId}`);
      return await prisma.phoneNumberCampaign.delete({
        where: {
          id: existingAttachment.id
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
      
      // Ensure result is always an array
      return result || [];
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

  async function getCampaignById(id) {
    try {
      return await prisma.campaignMailing.findUnique({
        where: { id },
        include: {
          phoneNumbers: true,
          prompt: true,
          knowledgeBases: true,
        }
      });
    } catch (error) {
      logger.error(`Error getting campaign by ID ${id}:`, error.message);
      throw error;
    }
  }

  async function getCampaignKnowledgeBases(id) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({ where: { id }, include: { knowledgeBases: true } });
      return campaign.knowledgeBases;
    } catch (error) {
      logger.error(`Error getting knowledge bases for campaign ${id}:`, error);
      throw error;
    }
  }

  async function setCampaignPrompt(id, promptId) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { promptId, updatedAt: new Date() }
      });
      logger.info(`Prompt set for campaign: ${id}`);
      return updatedCampaign; 
    } catch (error) {
      logger.error(`Error setting prompt for campaign ${id}:`, error);
      throw error;
    }
  }

  async function getCampaignByName(name) {
    try {
      return await prisma.campaignMailing.findUnique({
        where: { name },
        include: {
          phoneNumbers: true,
          prompt: true,
          knowledgeBases: true,
        }
      });
    } catch (error) {
      logger.error(`Error getting campaign by name ${name}:`, error.message);
      throw error;
    }
  }

  async function addNotificationTelegramId(id, telegramId) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: {
          notificationTelegramIds: {
            push: BigInt(telegramId)
          },
          updatedAt: new Date()
        }
      });
      logger.info(`Notification Telegram ID added for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error adding notification Telegram ID for campaign ${id}:`, error);
      throw error;
    }
  }
  
  async function removeNotificationTelegramId(id, telegramId) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({ where: { id } });
      const updatedIds = campaign.notificationTelegramIds.filter(id => id !== BigInt(telegramId));
      
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: {
          notificationTelegramIds: updatedIds,
          updatedAt: new Date()
        }
      });
      logger.info(`Notification Telegram ID removed for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error removing notification Telegram ID for campaign ${id}:`, error);
      throw error;
    }
  }
  
  async function getNotificationTelegramIds(id) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({
        where: { id },
        select: { notificationTelegramIds: true }
      });
      return campaign.notificationTelegramIds;
    } catch (error) {
      logger.error(`Error getting notification Telegram IDs for campaign ${id}:`, error);
      throw error;
    }
  }
  

  async function setSecondaryPrompt(id, promptId) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { secondaryPromptId: promptId, updatedAt: new Date() }
      });
      logger.info(`Secondary prompt set for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error setting secondary prompt for campaign ${id}:`, error);
      throw error;
    }
  }

  async function toggleSecondaryAgent(id, isActive) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { isSecondaryAgentActive: isActive, updatedAt: new Date() }
      });
      logger.info(`Secondary agent toggled ${isActive ? 'on' : 'off'} for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error toggling secondary agent for campaign ${id}:`, error);
      throw error;
    }
  }

  async function setCampaignModel(id, modelName) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { modelName, updatedAt: new Date() }
      });
      logger.info(`Model set for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error setting model for campaign ${id}:`, error);
      throw error;
    }
  }

  async function getCampaignModel(id) {
    try {
      const campaign = await prisma.campaignMailing.findUnique({ where: { id } });
      return campaign.modelName;
    } catch (error) {
      logger.error(`Error getting model for campaign ${id}:`, error);
      throw error;
    }
  }

  async function setCampaignOpenAIKey(id, openaiApiKey) {
    try {
      const updatedCampaign = await prisma.campaignMailing.update({
        where: { id },
        data: { openaiApiKey, updatedAt: new Date() }
      });
      logger.info(`OpenAI API key set for campaign: ${id}`);
      return updatedCampaign;
    } catch (error) {
      logger.error(`Error setting OpenAI API key for campaign ${id}:`, error);
      throw error;
    }
  }

  module.exports = {
    getCampaignById,
    getCampaigUserId,
    setCampaignPrompt,
    attachPhoneNumber,
    detachPhoneNumber,
    setGoogleSheetUrl,
    setCampaignPrompt,
    getActiveCampaign,
    getCampaignByName,
    setCampaignMessage,
    getCampaignMailing,
    setPlatformPriority,
    getPlatformPriority,
    listCampaignMailings,
    setDefaultPhoneNumber,
    getDefaultPhoneNumber,
    createCampaignMailing,
    toggleCampaignActivity,
    getCampaignPhoneNumbers,
    getCampaignMailingByName,
    addNotificationTelegramId,
    getNotificationTelegramIds,
    getFirstAvailablePhoneNumber,
    removeNotificationTelegramId,
    getActiveCampaignForPhoneNumber,
    checkPhoneNumbersAuthentication,
    setSecondaryPrompt,
    toggleSecondaryAgent,
    setCampaignModel,
    setCampaignOpenAIKey,
    getCampaignModel,
    getCampaignKnowledgeBases
  };