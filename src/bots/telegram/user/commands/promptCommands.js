// src/bot/user/commands/promptCommands.js

const logger = require('../../../../utils/logger');
const { promptService } = require('../../../../services/prompt');
const { userService } = require('../../../../services/user');
const {
  setUserState,
  getUserState,
  clearUserState,
} = require('../utils/userState');

module.exports = {
  '/create_prompt ([^\\s]+)': async (bot, msg, match) => {
    const [, promptName] = match;
    if (!promptName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название промпта. Например: /create_prompt МойПромпт',
      );
      return;
    }

    try {
      const prompt = await promptService.createPrompt(promptName, '');
      bot.sendMessage(
        msg.chat.id,
        `Промпт "${promptName}" успешно создан. ID: ${prompt.id}`,
      );
      setUserState(msg.from.id, {
        action: 'set_prompt_content',
        promptId: prompt.id,
        promptName,
      });
      bot.sendMessage(
        msg.chat.id,
        `Пожалуйста, отправьте содержимое для промпта "${promptName}"`,
      );
    } catch (error) {
      logger.error('Error creating prompt:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при создании промпта. Пожалуйста, попробуйте позже.',
      );
    }
  },

  '/set_prompt_content ([^\\s]+)': async (bot, msg, match) => {
    const [, promptName] = match;
    if (!promptName) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите название промпта. Например: /set_prompt_content МойПромпт',
      );
      return;
    }

    try {
      const prompt = await promptService.getPromptByName(promptName);
      if (!prompt) {
        bot.sendMessage(msg.chat.id, `Промпт "${promptName}" не найден.`);
        return;
      }

      setUserState(msg.from.id, {
        action: 'set_prompt_content',
        promptId: prompt.id,
        promptName,
      });
      bot.sendMessage(
        msg.chat.id,
        `Пожалуйста, отправьте новое содержимое для промпта "${promptName}"`,
      );
    } catch (error) {
      logger.error('Error preparing to set prompt content:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при подготовке к установке содержимого промпта.',
      );
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

      bot.sendMessage(
        msg.chat.id,
        `Промпт: ${prompt.name}\n\nСодержимое:\n${prompt.content}`,
      );
    } catch (error) {
      logger.error('Error getting prompt:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при получении информации о промпте.',
      );
    }
  },

  '/list_prompts': async (bot, msg) => {
    try {
      const prompts = await promptService.listPrompts();
      if (prompts.length === 0) {
        bot.sendMessage(msg.chat.id, 'У вас нет созданных промптов.');
        return;
      }

      const promptList = prompts.map((p) => `- ${p.name}`).join('\n');
      bot.sendMessage(msg.chat.id, `Ваши промпты:\n${promptList}`);
    } catch (error) {
      logger.error('Error listing prompts:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при получении списка промптов.',
      );
    }
  },

  // Обработчик для всех текстовых сообщений
  messageHandler: async (bot, msg) => {
    const userId = msg.from.id;
    const userState = getUserState(userId);

    if (userState && userState.action === 'set_prompt_content') {
      try {
        await promptService.updatePrompt(userState.promptId, msg.text);
        bot.sendMessage(
          msg.chat.id,
          `Содержимое промпта "${userState.promptName}" успешно обновлено.`,
        );
        clearUserState(userId);
      } catch (error) {
        logger.error('Error setting prompt content:', error);
        bot.sendMessage(
          msg.chat.id,
          'Произошла ошибка при установке содержимого промпта.',
        );
      }
    }
  },

  '/set_user_openai_key (.+)': async (bot, msg, match) => {
    const [, openaiApiKey] = match;
    if (!openaiApiKey) {
      bot.sendMessage(
        msg.chat.id,
        'Пожалуйста, укажите ключ API OpenAI. Например: /set_user_openai_key sk-...',
      );
      return;
    }

    try {
      await userService.setUserOpenAIKey(msg.from.id, openaiApiKey);
      bot.sendMessage(
        msg.chat.id,
        'Ключ API OpenAI успешно установлен для вашего аккаунта.',
      );
    } catch (error) {
      logger.error('Error setting user OpenAI API key:', error);
      bot.sendMessage(
        msg.chat.id,
        'Произошла ошибка при установке ключа API OpenAI для вашего аккаунта.',
      );
    }
  },
};
