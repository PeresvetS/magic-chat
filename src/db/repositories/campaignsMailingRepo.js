// src/db/repositories/campaignsMailingRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function createCampaignMailing(telegramId, name) {
  try {
    // Ищем пользователя по telegram_id
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
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

async function listCampaignMailings(userId) {
  try {
    return await prisma.campaignMailing.findMany({
      where: { userId }
    });
  } catch (error) {
    logger.error('Error listing campaign mailings:', error);
    throw error;
  }
}

async function getActiveCampaign() {
  try {
    return await prisma.campaignMailing.findFirst({
      where: { isActive: true }
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

async function gePlatformPriority(id) {
  try {
    return await prisma.campaignMailing.findUnique({
      where: { id },
      select: { platformPriority: true }
    });
  } catch (error) {
    logger.error('Error getting platform priority:', error);
    throw error;
  }
}

async function attachPhoneNumber(campaignId, phoneNumber, platform) {
  try {
    // Проверяем, существует ли номер телефона и аутентифицирован ли он
    const existingPhoneNumber = await prisma.phoneNumber.findUnique({
      where: { phoneNumber }
    });

    if (!existingPhoneNumber) {
      throw new Error('Phone number does not exist');
    }

    if (!existingPhoneNumber.isAuthenticated) {
      throw new Error('Phone number is not authenticated');
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

async function detachPhoneNumber(campaignId, phoneNumber) {
  try {
    return await prisma.phoneNumberCampaign.delete({
      where: {
        phoneNumber_campaignId: {
          phoneNumber,
          campaignId
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
    return await prisma.phoneNumberCampaign.findMany({
      where: { campaignId },
      include: {
        phoneNumber: true
      }
    });
  } catch (error) {
    logger.error('Error getting campaign phone numbers:', error);
    throw error;
  }
}

async function toggleCampaignActivity(id, isActive) {
  try {
    const phoneNumbers = await getCampaignPhoneNumbers(id);
    if (phoneNumbers.length === 0 && isActive) {
      throw new Error('Cannot activate campaign without attached phone numbers');
    }

    // Проверяем, что все прикрепленные номера аутентифицированы
    const unauthenticatedNumbers = phoneNumbers.filter(p => !p.phoneNumber.isAuthenticated);
    if (unauthenticatedNumbers.length > 0) {
      throw new Error('Cannot activate campaign with unauthenticated phone numbers');
    }

    return await prisma.campaignMailing.update({
      where: { id },
      data: { isActive, updatedAt: new Date() }
    });
  } catch (error) {
    logger.error('Error toggling campaign activity:', error);
    throw error;
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
  gePlatformPriority,
  attachPhoneNumber,
  detachPhoneNumber,
  getCampaignPhoneNumbers,
  toggleCampaignActivity
};