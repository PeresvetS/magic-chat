// src/db/repositories/promptRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function createPrompt(name, content) {
  try {
    return await prisma.prompt.create({
      data: { name, content },
    });
  } catch (error) {
    logger.error('Error creating prompt:', error);
    throw error;
  }
}

async function getPromptById(id) {
  try {
    return await prisma.prompt.findUnique({
      where: { id },
    });
  } catch (error) {
    logger.error('Error getting prompt by id:', error);
    throw error;
  }
}

async function getPromptByName(name) {
  try {
    return await prisma.prompt.findUnique({
      where: { name },
    });
  } catch (error) {
    logger.error('Error getting prompt by name:', error);
    throw error;
  }
}

async function updatePrompt(id, content) {
  try {
    return await prisma.prompt.update({
      where: { id },
      data: { content, updatedAt: new Date() },
    });
  } catch (error) {
    logger.error('Error updating prompt:', error);
    throw error;
  }
}

async function deletePrompt(id) {
  try {
    return await prisma.prompt.delete({
      where: { id },
    });
  } catch (error) {
    logger.error('Error deleting prompt:', error);
    throw error;
  }
}

async function listPrompts() {
  try {
    return await prisma.prompt.findMany();
  } catch (error) {
    logger.error('Error listing prompts:', error);
    throw error;
  }
}

module.exports = {
  createPrompt,
  getPromptById,
  getPromptByName,
  updatePrompt,
  deletePrompt,
  listPrompts,
};
