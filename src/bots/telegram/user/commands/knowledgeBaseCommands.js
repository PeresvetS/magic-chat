// src/bot/user/commands/knowledgeBaseCommands.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const logger = require('../../../../utils/logger');
const knowledgeBaseServiceFactory = require('../../../../services/llm/knowledgeBase/knowledgeBaseServiceFactory');
const {
  setUserState,
  getUserState,
  clearUserState,
} = require('../utils/userState');
const {knowledgeBaseRepo} = require('../../../../db');
const { getCampaignByName } = require('../../../../services/campaign/src/campaignsMailingService');

module.exports = {
  '/create_kb ([^\\s]+) ([^\\s]+)': async (bot, msg, match) => {
    const [, kbName, campaignName] = match;
    if (!kbName || !campaignName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название базы знаний и name кампании. Например: /create_kb МояБазаЗнаний 123',
      );
      return;
    }
    const campaign = await getCampaignByName(campaignName);
    const campaignId = campaign.id;

    try {
      const knowledgeBaseService = knowledgeBaseServiceFactory.getInstanceForCampaign(parseInt(campaignId));
      const knowledgeBase = await knowledgeBaseService.createKnowledgeBase(
        kbName,
        '',
        campaignId,
        [],
      );
      bot.sendMessage(
        msg.chat.id,
        `База знаний "${kbName}" успешно создана для кампании ${campaignId}. ID: ${knowledgeBase.id}`,
      );
      setUserState(msg.from.id, {
        action: 'add_kb_document',
        kbId: knowledgeBase.id,
        kbName,
        campaignId: parseInt(campaignId),
      });
      bot.sendMessage(
        msg.chat.id,
        `Пожалуйста, отправьте документ для добавления в базу знаний "${kbName}"`,
      );
    } catch (error) {
      logger.error('Error creating knowledge base:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при создании базы знаний.',
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
      const userId = msg.from.id;
      
      // Получаем базу знаний по имени
      const knowledgeBase = await knowledgeBaseRepo.findByName(kbName);
      
      if (!knowledgeBase) {
        bot.sendMessage(msg.chat.id, `База знаний "${kbName}" не найдена.`);
        return;
      }

      // Получаем campaignId из базы знаний
      const campaignId = knowledgeBase.campaignId;

      // Создаем экземпляр KnowledgeBaseService для этой кампании
      const knowledgeBaseService = knowledgeBaseServiceFactory.getInstanceForCampaign(campaignId);

      // Устанавливаем состояние пользователя
      setUserState(userId, {
        action: 'add_kb_document',
        kbId: knowledgeBase.id,
        kbName,
        campaignId,
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
      const knowledgeBases = await knowledgeBaseServiceFactory.getInstanceForCampaign(parseInt(userState.campaignId)).listKnowledgeBases();
      if (knowledgeBases.length === 0) {
        bot.sendMessage(msg.chat.id, 'У вас нет созданных баз знаний.');
        return;
      }

      const kbList = knowledgeBases
        .map((kb) => `- ${kb.name} (ID: ${kb.id}, Кампания: ${kb.campaignId})`)
        .join('\n');
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
      await knowledgeBaseServiceFactory.getInstanceForCampaign(parseInt(userState.campaignId)).deleteKnowledgeBase(kbName);
      bot.sendMessage(msg.chat.id, `База знаний "${kbName}" успешно удалена.`);
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
        const fileName = msg.document.file_name;
        
        // Создаем директорию temp, если она не существует
        const tempDir = path.join(__dirname, '..', '..', '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Формируем путь к файлу
        const filePath = path.join(tempDir, fileName.replace(/[/\\?%*:|"<>]/g, '-'));

        logger.info(`Попытка скачивания файла: ${filePath}`);
        
        // Скачиваем файл с серверов Telegram
        const fileLink = await bot.getFileLink(fileId);
        const response = await axios({
          method: 'get',
          url: fileLink,
          responseType: 'stream'
        });

        // Сохраняем файл
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        logger.info(`Файл успешно скачан и сохранен: ${filePath}`);

        const file = {
          name: fileName,
          path: filePath,
        };

        const knowledgeBaseService = knowledgeBaseServiceFactory.getInstanceForCampaign(userState.campaignId);
        await knowledgeBaseService.addDocumentToKnowledgeBase(
          userState.kbId,
          file,
        );

        bot.sendMessage(
          msg.chat.id,
          `Документ успешно добавлен в базу знаний "${userState.kbName}".`,
        );
        clearUserState(userId);

        // Удаляем временный файл
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.error('Ошибка при добавлении документа в базу знаний:', error);
        bot.sendMessage(
          msg.chat.id,
          'Произошла ошибка при добавлении документа в базу знаний.',
        );
      }
    }
  },
};
