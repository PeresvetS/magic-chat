// src/utils/userUtils.js

const { userRepo } = require('../db');

async function ensureUserExistsById(id) {
  const user = await userRepo.getUserById(id);
  if (user === null) {
    throw new Error(`User with ID ${id} not found`);
  }
  return user;
}

async function ensureUserExistsByTgId(telegramId) {
  const user = await userRepo.getUserByTgId(telegramId);
  if (user === null) {
    throw new Error(`User with telegramId ${telegramId} not found`);
  }
  return user.id;
}

module.exports = {
  ensureUserExistsByTgId,
  ensureUserExistsById,
};