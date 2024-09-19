// src/services/dialog/dialogService.js

const { dialogRepo } = require('../../db');
const logger = require('../../utils/logger');

async function saveDialog(
    userId,
    contactId,
    platform,
    userRequest,
    assistantResponse,
    phoneRecipientNumber,
  ) {
    try {
      await dialogRepo.saveMessage(
        userId,
        Number(contactId),
        platform,
        userRequest,
        assistantResponse,
        phoneRecipientNumber,
      );
    } catch (error) {
      logger.error('Ошибка сохранения диалога:', error);
      throw error;
    }
  }
  
  async function isNewContact(userId, contactId, platform) {
    try {
      const existingDialog = await dialogRepo.getDialog(
        userId,
        contactId,
        platform,
      );
      return !existingDialog;
    } catch (error) {
      logger.error('Ошибка при проверке, является ли контакт новым:', error);
      throw error;
    }
  }

module.exports = {
    saveDialog,
    isNewContact,
};