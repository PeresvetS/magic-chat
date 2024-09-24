// src/db/repositories/whatsappSessionsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveSession(phoneNumber, session) {
  try {
    if (!session) {
      throw new Error('Session data is undefined or null');
    }

    const sessionString =
      typeof session === 'string' ? session : JSON.stringify(session);

    await prisma.whatsappSession.upsert({
      where: { phoneNumber },
      update: { session: sessionString },
      create: { phoneNumber, session: sessionString },
    });
    logger.info(`WhatsApp session saved for ${phoneNumber}`);
  } catch (error) {
    logger.error(`Error saving WhatsApp session for ${phoneNumber}:`, error);
    throw error;
  }
}

async function deleteSession(phoneNumber) {
  try {
    const result = await prisma.whatsappSession.deleteMany({
      where: { phoneNumber },
    });
    
    if (result.count > 0) {
      logger.info(`WhatsApp session for ${phoneNumber} deleted successfully`);
    } else {
      logger.info(`No WhatsApp session found for ${phoneNumber}. Nothing to delete.`);
    }
  } catch (error) {
    logger.error(`Error deleting WhatsApp session for ${phoneNumber}:`, error);
    throw error;
  }
}

async function getAllSessions() {
  try {
    return await prisma.whatsappSession.findMany();
  } catch (error) {
    logger.error('Error fetching all WhatsApp sessions:', error);
    throw error;
  }
}

async function getSession(phoneNumber) {
  try {
    const session = await prisma.whatsappSession.findUnique({
      where: { phoneNumber },
    });
    return session ? JSON.parse(session.session) : null;
  } catch (error) {
    logger.error(`Error fetching WhatsApp session for ${phoneNumber}:`, error);
    throw error;
  }
}

async function updatePhoneNumberWhatsAppStatus(
  phoneNumber,
  isAuthenticated,
  accountType = 'regular',
) {
  try {
    const phoneNumberRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: { whatsappAccount: true },
    });

    if (!phoneNumberRecord) {
      throw new Error(`Phone number ${phoneNumber} not found`);
    }

    if (phoneNumberRecord.whatsappAccount) {
      await prisma.whatsappAccount.update({
        where: { phoneNumberId: phoneNumberRecord.id },
        data: {
          isAuthenticated,
          accountType,
        },
      });
    } else {
      await prisma.whatsappAccount.create({
        data: {
          phoneNumber: { connect: { id: phoneNumberRecord.id } },
          isAuthenticated,
          accountType,
        },
      });
    }

    logger.info(
      `WhatsApp status updated for ${phoneNumber}: ${isAuthenticated}, type: ${accountType}`,
    );
  } catch (error) {
    logger.error(`Error updating WhatsApp status for ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  saveSession,
  deleteSession,
  getAllSessions,
  getSession,
  updatePhoneNumberWhatsAppStatus,
};
