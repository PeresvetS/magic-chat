const { userRepo } = require('../../../db');

async function ensureUserExistsById(id) {
  const user = await userRepo.getUserById(id);
  if (user === null) {
    throw new Error(`User with ID ${id} not found`);
  }
  return user;
}

module.exports = { ensureUserExistsById };
