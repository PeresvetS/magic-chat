// src/db/repositories/telegramSessionsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function getSession(phoneNumber) {
  try {
    return await prisma.telegramSession.findUnique({
      where: { phoneNumber: phoneNumber }
    });
  } catch (error) {
    logger.error('Error getting Telegram session from database', error);
    throw error;
  }
}

async function saveSession(phoneNumber, sessionString) {
  try {
    const session = await prisma.telegramSession.upsert({
      where: { phoneNumber },
      update: { session: sessionString },
      create: { phoneNumber, session: sessionString }
    });
    logger.info(`Telegram session saved/updated for: ${phoneNumber}`);
    return session;
  } catch (error) {
    logger.error('Error saving Telegram session to database', error);
    throw error;
  }
}

async function getAllSessions() {
  try {
    return await prisma.telegramSession.findMany();
  } catch (error) {
    logger.error('Error getting all Telegram sessions from database', error);
    throw error;
  }
}

module.exports = {
  getSession,
  saveSession,
  getAllSessions
};