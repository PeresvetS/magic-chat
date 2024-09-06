// src/db/repositories/dialogRepo.js

const prisma = require('../utils/prisma');
const logger = require('../../utils/logger');

async function getDialog(userId, contactId, platform) {
  try {
    return await prisma.dialog.findUnique({
      where: {
        userId_contactId_platform: {
          userId,
          contactId: contactId.toString(),
          platform,
        },
      },
    });
  } catch (error) {
    logger.error('Ошибка получения диалога:', error);
    throw error;
  }
}

async function saveMessage(
  userId,
  contactId,
  platform,
  userRequest,
  assistantResponse,
  contactPhone,
) {
  try {
    let dialog = await getDialog(userId, contactId, platform);

    if (!dialog) {
      dialog = await prisma.dialog.create({
        data: {
          userId,
          contactId: contactId.toString(),
          contactPhone,
          platform,
        },
      });
    }

    return await prisma.message.create({
      data: {
        dialogId: dialog.id,
        userRequest,
        assistantResponse,
      },
    });
  } catch (error) {
    logger.error('Ошибка сохранения сообщения:', error);
    throw error;
  }
}

module.exports = {
  getDialog,
  saveMessage,
};
