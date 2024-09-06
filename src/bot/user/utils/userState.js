// src/bot/user/utils/userState.js

const logger = require('../../../utils/logger');

const userStates = {};

function setUserState(userId, state) {
  userStates[userId] = state;
  logger.info(`User state set for ${userId}: ${JSON.stringify(state)}`);
  return state;
}

function getUserState(userId) {
  const state = userStates[userId];
  logger.info(`Getting user state for ${userId}: ${JSON.stringify(state)}`);
  return state;
}

function clearUserState(userId) {
  const state = userStates[userId];
  delete userStates[userId];
  logger.info(
    `Cleared user state for ${userId}. Previous state: ${JSON.stringify(state)}`,
  );
}

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
};
