// src/db/repositories/whatsappSessionsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

async function deleteSession(phoneNumber) {
  try {
    const sessionPath = path.join(__dirname, `../../../tokens/session-${phoneNumber}`);
    await fs.rmdir(sessionPath, { recursive: true });
    logger.info(`WhatsApp session deleted for ${phoneNumber}`);
  } catch (error) {
    logger.error(`Error deleting WhatsApp session for ${phoneNumber}:`, error);
    throw error;
  }
}

async function getAllSessions() {
  try {
    const tokensDir = path.join(__dirname, '../../../tokens');
    const sessions = await fs.readdir(tokensDir);
    return sessions.filter(session => session.startsWith('session-')).map(session => ({
      phoneNumber: session.replace('session-', '')
    }));
  } catch (error) {
    logger.error('Error fetching all WhatsApp sessions:', error);
    throw error;
  }
}

async function getSession(phoneNumber) {
  try {
    const sessionPath = path.join(__dirname, `../../../tokens/session-${phoneNumber}`);
    await fs.access(sessionPath);
    return true; // Сессия существует
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false; // Сессия не существует
    }
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

async function checkSessionStatus(phoneNumber) {
  try {
    const sessionPath = path.join(__dirname, `../../../tokens/session-${phoneNumber}`);
    const stats = await fs.stat(sessionPath);
    const isValid = stats.isDirectory() && (Date.now() - stats.mtime.getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 дней
    return isValid;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false; // Сессия не существует
    }
    logger.error(`Error checking WhatsApp session status for ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  deleteSession,
  getAllSessions,
  getSession,
  updatePhoneNumberWhatsAppStatus,
  checkSessionStatus
};