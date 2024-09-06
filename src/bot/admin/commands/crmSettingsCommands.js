// src/admin/commands/crmSettingsCommands.js

const logger = require('../../../utils/logger');
const { bitrixService, amoCrmService } = require('../../../services/crm');

module.exports = {
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