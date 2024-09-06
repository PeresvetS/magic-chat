// src/db/repositories/parsedUsersRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveParsedUsers(campaignId, groupUsername, categorizedUsers) {
  try {
    const parsedUsers = Object.entries(categorizedUsers).flatMap(
      ([category, users]) =>
        users.map((user) => ({
          campaignId,
          groupUsername,
          userId: user.id,
          username: user.username || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          bio: user.about || '',
          category,
          lastSeen: user.status ? new Date(user.status.wasOnline * 1000) : null,
          hasChannel: !!user.username,
        })),
    );

    await prisma.parsedUser.createMany({
      data: parsedUsers,
      skipDuplicates: true,
    });

    logger.info(
      `Saved parsed users for campaign ${campaignId}, group ${groupUsername}`,
    );
  } catch (error) {
    logger.error(
      `Error saving parsed users for campaign ${campaignId}, group ${groupUsername}:`,
      error,
    );
    throw error;
  }
}

module.exports = {
  saveParsedUsers,
};
