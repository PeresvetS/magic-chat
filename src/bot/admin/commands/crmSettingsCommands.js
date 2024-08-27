// src/admin/commands/crmSettingsCommands.js

const { bitrixService, amoCrmService } = require('../../../services/crm');
const logger = require('../../../utils/logger');

module.exports = {
  '/set_bitrix_webhook': async (bot, msg, match) => {
    const [, webhookId, inboundUrl, outboundToken] = match;
    try {
      await bitrixService.updateIntegration(msg.from.id, webhookId, inboundUrl, outboundToken);
      bot.sendMessage(msg.chat.id, 'Bitrix интеграция успешно обновлена.');
    } catch (error) {
      logger.error('Error setting Bitrix integration:', error);
      bot.sendMessage(msg.chat.id, `Ошибка при установке Bitrix интеграции: ${error.message}`);
    }
  },

  '/set_amocrm_webhook': async (bot, msg, match) => {
    const [, webhookId, inboundUrl, outboundToken] = match;
    try {
      await amoCrmService.updateIntegration(msg.from.id, webhookId, inboundUrl, outboundToken);
      bot.sendMessage(msg.chat.id, 'AmoCRM интеграция успешно обновлена.');
    } catch (error) {
      logger.error('Error setting AmoCRM integration:', error);
      bot.sendMessage(msg.chat.id, `Ошибка при установке AmoCRM интеграции: ${error.message}`);
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
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о CRM интеграциях: ${error.message}`);
    }
  }
};