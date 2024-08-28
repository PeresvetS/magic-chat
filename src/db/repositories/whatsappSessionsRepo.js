// src/db/repositories/whatsappSessionsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveSession(phoneNumber, session) {
  try {
    await prisma.whatsappSession.upsert({
      where: { phoneNumber },
      update: { session: JSON.stringify(session) },
      create: { phoneNumber, session: JSON.stringify(session) }
    });
    logger.info(`WhatsApp session saved for ${phoneNumber}`);
  } catch (error) {
    logger.error(`Error saving WhatsApp session for ${phoneNumber}:`, error);
    throw error;
  }
}

async function deleteSession(phoneNumber) {
  try {
    await prisma.whatsappSession.delete({ where: { phoneNumber } });
    logger.info(`WhatsApp session deleted for ${phoneNumber}`);
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
      where: { phoneNumber }
    });
    return session ? JSON.parse(session.session) : null;
  } catch (error) {
    logger.error(`Error fetching WhatsApp session for ${phoneNumber}:`, error);
    throw error;
  }
}

async function updatePhoneNumberWhatsAppStatus(phoneNumber, isAuthenticated, accountType = 'regular') {
  try {
    const phoneNumberRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumber },
      include: { whatsappAccount: true }
    });

    if (!phoneNumberRecord) {
      throw new Error(`Phone number ${phoneNumber} not found`);
    }

    if (phoneNumberRecord.whatsappAccount) {
      await prisma.whatsappAccount.update({
        where: { phoneNumberId: phoneNumberRecord.id },
        data: { 
          isAuthenticated: isAuthenticated,
          accountType: accountType
        }
      });
    } else {
      await prisma.whatsappAccount.create({
        data: {
          phoneNumber: { connect: { id: phoneNumberRecord.id } },
          isAuthenticated: isAuthenticated,
          accountType: accountType
        }
      });
    }

    logger.info(`WhatsApp status updated for ${phoneNumber}: ${isAuthenticated}, type: ${accountType}`);
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
  updatePhoneNumberWhatsAppStatus
};