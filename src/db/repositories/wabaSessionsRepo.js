// src/db/repositories/wabaSessionsRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

const wabaSessionsRepo = {
  async getSession(phoneNumber) {
    try {
      const session = await prisma.wABASession.findUnique({
        where: { phoneNumber }
      });
      return session ? JSON.parse(session.session) : null;
    } catch (error) {
      logger.error('Error getting WABA session from database', error);
      throw error;
    }
  },

  async saveSession(phoneNumber, sessionString) {
    try {
      const session = await prisma.wABASession.upsert({
        where: { phoneNumber },
        update: { session: sessionString },
        create: { phoneNumber, session: sessionString }
      });
      logger.info(`WABA session saved/updated for: ${phoneNumber}`);
      return session;
    } catch (error) {
      logger.error('Error saving WABA session to database', error);
      throw error;
    }
  },

  async deleteSession(phoneNumber) {
    try {
      await prisma.wABASession.delete({
        where: { phoneNumber }
      });
      logger.info(`WABA session deleted for: ${phoneNumber}`);
    } catch (error) {
      logger.error('Error deleting WABA session from database', error);
      throw error;
    }
  },

  async getAllSessions() {
    try {
      return await prisma.wABASession.findMany();
    } catch (error) {
      logger.error('Error getting all WABA sessions from database', error);
      throw error;
    }
  }
};

module.exports = wabaSessionsRepo;