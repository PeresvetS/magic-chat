// src/bot/user/commands/promptCommands.js

const { promptService } = require('../../../services/prompt');
const logger = require('../../../utils/logger');

// Объект для хранения состояния пользователей
const userStates = {};

module.exports = {
  '/create_prompt ([^\\s]+)': async (bot, msg, match) => {
    const [, promptName] = match;
    if (!promptName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название промпта. Например: /create_prompt МойПромпт');
      return;
    }

    try {
      const prompt = await promptService.createPrompt(promptName, '');
      bot.sendMessage(msg.chat.id, `Промпт "${promptName}" успешно создан. ID: ${prompt.id}`);
      userStates[msg.from.id] = {
        action: 'set_prompt_content',
        promptId: prompt.id,
        promptName: promptName
      };
      bot.sendMessage(msg.chat.id, `Пожалуйста, отправьте содержимое для промпта "${promptName}"`);
    } catch (error) {
      logger.error('Error creating prompt:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при создании промпта. Пожалуйста, попробуйте позже.');
    }
  },

  '/set_prompt_content ([^\\s]+)': async (bot, msg, match) => {
    const [, promptName] = match;
    if (!promptName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название промпта. Например: /set_prompt_content МойПромпт');
      return;
    }

    try {
      const prompt = await promptService.getPromptByName(promptName);
      if (!prompt) {
        bot.sendMessage(msg.chat.id, `Промпт "${promptName}" не найден.`);
        return;
      }

      userStates[msg.from.id] = {
        action: 'set_prompt_content',
        promptId: prompt.id,
        promptName: promptName
      };
      bot.sendMessage(msg.chat.id, `Пожалуйста, отправьте новое содержимое для промпта "${promptName}"`);
    } catch (error) {
      logger.error('Error preparing to set prompt content:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при подготовке к установке содержимого промпта.');
    }
  },

  '/get_prompt ([^\\s]+)': async (bot, msg, match) => {
    const [, promptName] = match;
    if (!promptName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название промпта.');
      return;
    }

    try {
      const prompt = await promptService.getPromptByName(promptName);
      if (!prompt) {
        bot.sendMessage(msg.chat.id, `Промпт "${promptName}" не найден.`);
        return;
      }

      bot.sendMessage(msg.chat.id, `Промпт: ${prompt.name}\n\nСодержимое:\n${prompt.content}`);
    } catch (error) {
      logger.error('Error getting prompt:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении информации о промпте.');
    }
  },

  '/list_prompts': async (bot, msg) => {
    try {
      const prompts = await promptService.listPrompts();
      if (prompts.length === 0) {
        bot.sendMessage(msg.chat.id, 'У вас нет созданных промптов.');
        return;
      }

      const promptList = prompts.map(p => `- ${p.name}`).join('\n');
      bot.sendMessage(msg.chat.id, `Ваши промпты:\n${promptList}`);
    } catch (error) {
      logger.error('Error listing prompts:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка промптов.');
    }
  },

  // Обработчик для всех текстовых сообщений
  messageHandler: async (bot, msg) => {
    const userId = msg.from.id;
    const userState = userStates[userId];

    if (userState && userState.action === 'set_prompt_content') {
      try {
        await promptService.updatePrompt(userState.promptId, msg.text);
        bot.sendMessage(msg.chat.id, `Содержимое промпта "${userState.promptName}" успешно обновлено.`);
        delete userStates[userId];
      } catch (error) {
        logger.error('Error setting prompt content:', error);
        bot.sendMessage(msg.chat.id, 'Произошла ошибка при установке содержимого промпта.');
      }
    }
  },
};