// src/services/conversation/conversationService.js

const { getMaxInactivityTime } = require('../../db');
const logger = require('../../utils/logger');

async function cleanupInactiveConversations(activeConversations) {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [chatId, conversation] of activeConversations.entries()) {
    const MAX_INACTIVITY_TIME = await getMaxInactivityTime(conversation.senderPhone);
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