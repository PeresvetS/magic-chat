// src/services/conversation/conversationState.js

const { conversationStateRepo } = require('../../db');

async function saveConversationState(leadId, output, summary) {
  await conversationStateRepo.saveConversationState(leadId, output, summary);
}

async function getConversationState(leadId) {
  return await conversationStateRepo.getConversationState(leadId);
}

async function getPendingConversationStates() {
  return await conversationStateRepo.getPendingConversationStates();
}

module.exports = {
  saveConversationState,
  getConversationState,
  getPendingConversationStates,
};
