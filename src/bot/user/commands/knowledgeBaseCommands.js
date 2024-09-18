// src/bot/user/commands/knowledgeBaseCommands.js

const logger = require('../../../utils/logger');
const knowledgeBaseService = require('../../../services/gpt/knowledgeBaseService');
const { setUserState, getUserState, clearUserState } = require('../utils/userState');
const fs = require('fs');
const path = require('path');

module.exports = {
  '/create_kb ([^\\s]+) ([^\\s]+)': async (bot, msg, match) => {
    const [, kbName, campaignId] = match;
    if (!kbName || !campaignId) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название базы знаний и ID кампании. Например: /create_kb МояБазаЗнаний 123',
      );
      return;
    }
    try {
      const knowledgeBase = await knowledgeBaseService.createKnowledgeBase(kbName, '', parseInt(campaignId), []);
      bot.sendMessage(
        msg.chat.id,
        `База знаний "${kbName}" успешно создана для кампании ${campaignId}. ID: ${knowledgeBase.id}`,
      );
      setUserState(msg.from.id, {
        action: 'add_kb_document',
        kbId: knowledgeBase.id,
        kbName,
      });
      bot.sendMessage(
        msg.chat.id,
        `Пожалуйста, отправьте документ для добавления в базу знаний "${kbName}"`,
      );
    } catch (error) {
      logger.error('Error creating knowledge base:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при с��здании базы знаний.',
      );
    }
  },

  '/add_kb_document ([^\\s]+)': async (bot, msg, match) => {
    const [, kbName] = match;
    if (!kbName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название базы знаний. Например: /add_kb_document МояБазаЗнаний',
      );
      return;
    }
    try {
      const knowledgeBase = await knowledgeBaseService.getKnowledgeBaseByName(kbName);
      if (!knowledgeBase) {
        bot.sendMessage(msg.chat.id, `База знаний "${kbName}" не найдена.`);
        return;
      }

      setUserState(msg.from.id, {
        action: 'add_kb_document',
        kbId: knowledgeBase.id,
        kbName,
      });
      bot.sendMessage(
        msg.chat.id,
        `Пожалуйста, отправьте документ для добавления в базу знаний "${kbName}"`,
      );
    } catch (error) {
      logger.error('Error preparing to add document to knowledge base:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при подготовке к добавлению документа в базу знаний.',
      );
    }
  },

  '/list_kb': async (bot, msg) => {
    try {
      const knowledgeBases = await knowledgeBaseService.listKnowledgeBases();
      if (knowledgeBases.length === 0) {
        bot.sendMessage(msg.chat.id, 'У вас нет созданных баз знаний.');
        return;
      }

      const kbList = knowledgeBases.map((kb) => `- ${kb.name} (ID: ${kb.id}, Кампания: ${kb.campaignId})`).join('\n');
      bot.sendMessage(msg.chat.id, `Ваши базы знаний:\n${kbList}`);
    } catch (error) {
      logger.error('Error listing knowledge bases:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при получении списка баз знаний.',
      );
    }
  },

  '/delete_kb ([^\\s]+)': async (bot, msg, match) => {
    const [, kbName] = match;
    if (!kbName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название базы знаний для удаления. Например: /delete_kb МояБазаЗнаний',
      );
      return;
    }
    try {
      await knowledgeBaseService.deleteKnowledgeBase(kbName);
      bot.sendMessage(
        msg.chat.id,
        `База знаний "${kbName}" успешно удалена.`,
      );
    } catch (error) {
      logger.error('Error deleting knowledge base:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при удалении базы знаний.',
      );
    }
  },

  // Обработчик для всех документов
  documentHandler: async (bot, msg) => {
    const userId = msg.from.id;
    const userState = getUserState(userId);

    if (userState && userState.action === 'add_kb_document') {
      try {
        const fileId = msg.document.file_id;
        const fileInfo = await bot.getFile(fileId);
        const fileName = msg.document.file_name;
        const filePath = path.join(__dirname, '..', '..', '..', 'temp', fileName);

        // Скачиваем файл
        await bot.downloadFile(fileId, filePath);

        const file = {
          name: fileName,
          path: filePath
        };

        await knowledgeBaseService.addDocumentToKnowledgeBase(userState.kbId, file);
        
        bot.sendMessage(
          msg.chat.id,
          `Документ успешно добавлен в базу знаний "${userState.kbName}".`,
        );
        clearUserState(userId);

        // Удаляем временный файл
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.error('Error adding document to knowledge base:', error);
        bot.sendMessage(
          msg.chat.id,
          'Произошла ошибка при добавлении документа в базу знаний.',
        );
      }
    }
  },
};
