// src/bot/user/utils/userState.js

const logger = require('../../../utils/logger');

const userStates = {};

function setUserState(userId, state) {
  userStates[userId] = state;
  logger.info(`User state set for ${userId}: ${JSON.stringify(state)}`);
  return state;
}

function getUserState(userId) {
  const state = userStates[userId] || {};
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

function initUserState(userId, initialState = {}) {
  if (!userStates[userId]) {
    setUserState(userId, initialState);
    logger.info(
      `Initialized user state for ${userId} with: ${JSON.stringify(initialState)}`,
    );
  } else {
    logger.info(
      `User state already exists for ${userId}, skipping initialization`,
    );
  }
}

function updateUserState(userId, updates) {
  const currentState = getUserState(userId);
  const newState = { ...currentState, ...updates };
  setUserState(userId, newState);
  logger.info(
    `Updated user state for ${userId}. New state: ${JSON.stringify(newState)}`,
  );
  return newState;
}

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
  initUserState,
  updateUserState,
};
