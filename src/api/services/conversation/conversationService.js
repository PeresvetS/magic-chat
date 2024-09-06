// src/services/conversation/conversationService.js

const logger = require('../../../utils/logger');
const { phoneNumberRepo } = require('../../../db');

async function cleanupInactiveConversations(activeConversations) {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [chatId, conversation] of activeConversations.entries()) {
    const MAX_INACTIVITY_TIME = await phoneNumberRepo.getMaxInactivityTime(conversation.senderPhone);
    if (now - conversation.lastActivityTime > MAX_INACTIVITY_TIME) {
      activeConversations.delete(chatId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info(`Очищено неактивных разговоров: ${cleanedCount}`);
  }
}

module.exports = { cleanupInactiveConversations };