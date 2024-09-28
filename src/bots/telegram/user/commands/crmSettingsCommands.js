  // src/bot/user/commands/crmSettingsCommands.js

const { bitrixService, amoCrmService } = require('../../../../services/crm');
const logger = require('../../../../utils/logger');

module.exports = {
  '/set_bitrix_webhook (https:\\/\\/.{10,})': async (bot, msg, match) => {
    const [, inboundUrl] = match;

    logger.info(`Setting Bitrix webhook for user ${msg.from.id}`);

    try {
      await bitrixService.setInboundUrl(msg.from.id, inboundUrl);
      bot.sendMessage(msg.chat.id, 'Bitrix интеграция успешно обновлена.');
    } catch (error) {
      logger.error('Error setting Bitrix integration:', error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при установке Bitrix интеграции: ${error.message}`,
      );
    }
  },

  '/set_amocrm_webhook (https:\\/\\/.{10,})': async (bot, msg, match) => {
    const [, inboundUrl] = match;

    logger.info(`Setting AmoCRM webhook for user ${msg.from.id}`);

    try {
      await amoCrmService.setInboundUrl(msg.from.id, inboundUrl);
      bot.sendMessage(msg.chat.id, 'AmoCRM интеграция успешно обновлена.');
    } catch (error) {
      logger.error('Error setting AmoCRM integration:', error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при установке AmoCRM интеграции: ${error.message}`,
      );
    }
  },

  '/set_bitrix_token ([a-zA-Z0-9]{32})': async (bot, msg, match) => {
    const [, outboundToken] = match;

    logger.info(`Setting Bitrix token for user ${msg.from.id}`);

    try {
      await bitrixService.setOutboundToken(msg.from.id, outboundToken);
      bot.sendMessage(msg.chat.id, 'API ключ Bitrix успешно установлен.');
    } catch (error) {
      logger.error('Error setting Bitrix API key:', error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при установке API ключа Bitrix: ${error.message}`,
      );
    }
  },

  '/set_amocrm_token ([a-zA-Z0-9]{32})': async (bot, msg, match) => {
    const [, outboundToken] = match;

    logger.info(`Setting AmoCRM token for user ${msg.from.id}`);

    try {
      await amoCrmService.setOutboundToken(msg.from.id, outboundToken);
      bot.sendMessage(msg.chat.id, 'API ключ AmoCRM успешно установлен.');
    } catch (error) {
      logger.error('Error setting AmoCRM API key:', error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при установке API ключа AmoCRM: ${error.message}`,
      );
    }
  },

  '/get_crm_info': async (bot, msg) => {
    try {
      const bitrixInfo = await bitrixService.getIntegrationInfo(msg.from.id);
      const amoCrmInfo = await amoCrmService.getIntegrationInfo(msg.from.id);
      const message = `
Bitrix интеграция:
${JSON.stringify(bitrixInfo, null, 2)}

AmoCRM интеграция:
${JSON.stringify(amoCrmInfo, null, 2)}
      `;
      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      logger.error('Error getting CRM info:', error);
      bot.sendMessage(
        msg.chat.id,
        `Ошибка при получении информации о CRM интеграциях: ${error.message}`,
      );
    }
  },
};
