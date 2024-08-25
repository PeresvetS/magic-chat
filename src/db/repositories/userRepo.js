// src/db/repositories/userRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function getUserByTgId(telegramId) {
  try {
    return await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });
  } catch (error) {
    logger.error('Error getting user by telegramId:', error);
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    logger.info(`Getting user for username: ${username}`);
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });
    
    if (user) {
      return user;
    } else {
      logger.info(`User with username ${cleanUsername} not found`);
      return null;
    }
  } catch (error) {
    logger.error('Error getting user by username:', error);
    throw error;
  }
}

async function getUserById(id) {
  try {
    logger.info(`Getting user by ID: ${id}`);
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      logger.info(`User with ID ${id} not found`);
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    throw error;
  }
}

async function createUser(telegramId, username = null, firstName = null, lastName = null) {
  try {
    return await prisma.user.create({
      data: {
        telegramId,
        username,
        firstName,
        lastName
      }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

async function getAllUsers() {
  try {
    return await prisma.user.findMany({
      orderBy: { id: 'asc' }
    });
  } catch (error) {
    logger.error('Error getting all users:', error);
    throw error;
  }
}

async function updateUserBanStatus(id, isBanned) {
  try {
    return await prisma.user.update({
      where: { id: id },
      data: { isBanned: isBanned }
    });
  } catch (error) {
    logger.error(`Error ${isBanned ? 'banning' : 'unbanning'} user:`, error);
    throw error;
  }
}

module.exports = {
  getUserByTgId,
  getUserByUsername,
  getUserById,
  createUser,
  getAllUsers,
  updateUserBanStatus
};