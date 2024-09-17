// src/db/repositories/conversationStateRepo.js 

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function saveConversationState(leadId, output, summary) {
    try {
        await prisma.conversationState.upsert({
            where: { leadId: leadId },
            update: {
              summary,
              lastMessage: output,
              pendingReply: false,
            },
            create: {
              leadId: leadId,
              summary,
              lastMessage: output,
              pendingReply: false,
            },
          });
          logger.info('Conversation state saved successfully');
    } catch (error) {
        logger.error('Error saving conversation state:', error);
    }
}

async function getConversationState(leadId) {
    try {
        return await prisma.conversationState.findUnique({
            where: { leadId: leadId },
        });
    } catch (error) {
        logger.error('Error getting conversation state:', error);
        throw error;
    }
}

async function getPendingConversationStates() {
    try {
        return await prisma.conversationState.findMany({
            where: { pendingReply: true },
            include: { lead: true },
        });
    } catch (error) {
        logger.error('Error getting pending conversation states:', error);
        throw error;
    }
}


module.exports = { saveConversationState, getConversationState, getPendingConversationStates };