// src/bot/user/commands/leadsCommands.js

const logger = require('../../../utils/logger');
const LeadsService = require('../../../services/leads/src/LeadsService');
const { processExcelFile } = require('../../../services/leads').xlsProcessor;
const { setUserState, getUserState, clearUserState } = require('../utils/userState');

function getStatusName(status) {
  switch (status) {
    case 'NEW': return 'Не обработаны';
    case 'UNAVAILABLE': return 'Недоступны';
    case 'PROCESSED_NEGATIVE': return 'Обработаны негативно';
    case 'PROCESSED_POSITIVE': return 'Обработаны позитивно';
    default: return status;
  }
}

module.exports = {
  '/create_leadsdb ([^\\s]+)': async (bot, msg, match) => {
    const [, leadsDBName] = match;
    if (!leadsDBName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название для базы лидов. Например: /create_leadsdb МояБазаЛидов');
      return;
    }

    try {
      const leadsDB = await LeadsService.createLeadsDB(leadsDBName, msg.from.id);
      bot.sendMessage(msg.chat.id, `База лидов "${leadsDBName}" успешно создана. ID: ${leadsDB.id}`);
    } catch (error) {
      logger.error('Error creating LeadsDB:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при создании базы лидов. Пожалуйста, попробуйте позже.');
    }
  },

'/list_leadsdb': async (bot, msg) => {
  try {
    const leadsDBs = await LeadsService.getLeadsDBs(msg.from.id);
    if (leadsDBs.length === 0) {
      bot.sendMessage(msg.chat.id, 'У вас нет созданных баз лидов.');
      return;
    }

    const leadsDBList = leadsDBs.map(db => `- ${db.name} (ID: ${db.id})`).join('\n');
    bot.sendMessage(msg.chat.id, `Ваши базы лидов:\n${leadsDBList}`);
  } catch (error) {
    logger.error('Error listing LeadsDBs:', error);
    bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка баз лидов.');
  }
},

'/upload_leads_to_db (.+)': async (bot, msg, match) => {
  const [, leadsDBName] = match;
  try {
    const leadsDB = await LeadsService.getLeadsDBByName(msg.from.id, leadsDBName);
    const userId = msg.from.id;
    const newState = {
      action: 'upload_leads_to_db',
      leadsDBId: leadsDB.id
    };
    setUserState(userId, newState);

    logger.info(`Set user state for ${userId}: ${JSON.stringify(newState)}`);

    bot.sendMessage(msg.chat.id, `Пожалуйста, отправьте Excel файл (XLS или XLSX) с лидами для базы лидов "${leadsDBName}"`);
  } catch (error) {
    bot.sendMessage(msg.chat.id, error.message);
  }
},

'/attach_leadsdb_to_campaign (.+) (.+)': async (bot, msg, match) => {
    const [, leadsDBName, campaignName] = match;
    try {
      await LeadsService.attachLeadsDBToCampaignByName(leadsDBName, campaignName, msg.from.id);
      bot.sendMessage(msg.chat.id, `База лидов "${leadsDBName}" успешно прикреплена к кампании "${campaignName}".`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка: ${error.message}`);
    }
  },

'/detach_leadsdb_from_campaign (.+) (.+)': async (bot, msg, match) => {
  const [, leadsDBName, campaignName] = match;
  try {
    await LeadsService.detachLeadsDBFromCampaignByName(leadsDBName, campaignName, msg.from.id);
    bot.sendMessage(msg.chat.id, `База лидов "${leadsDBName}" успешно откреплена от кампании "${campaignName}".`);
  } catch (error) {
    bot.sendMessage(msg.chat.id, `Ошибка: ${error.message}`);
  }
},

'/view_leads_in_db (.+)': async (bot, msg, match) => {
    const [, leadsDBName] = match;
    try {
      const statuses = ['NEW', 'UNAVAILABLE', 'PROCESSED_NEGATIVE', 'PROCESSED_POSITIVE'];
      let message = `Лиды в базе "${leadsDBName}":\n\n`;

      for (const status of statuses) {
        const leads = await LeadsService.getLeadsFromLeadsDBByName(leadsDBName, status, msg.from.id);
        message += `${getStatusName(status)} (${leads.length}):\n`;
        leads.slice(0, 5).forEach(lead => {
          message += `${lead.id} - ${lead.phone} ${lead.name ? `(${lead.name})` : ''}\n`;
        });
        if (leads.length > 5) {
          message += `... и еще ${leads.length - 5}\n`;
        }
        message += '\n';
      }

      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка: ${error.message}`);
    }
  },

'/update_lead_status (.+) ([0-9]+) (NEW|UNAVAILABLE|PROCESSED_NEGATIVE|PROCESSED_POSITIVE)': async (bot, msg, match) => {
  const [, leadsDBName, leadId, newStatus] = match;
  try {
    await LeadsService.updateLeadStatusByName(msg.from.id, leadsDBName, parseInt(leadId), newStatus);
    bot.sendMessage(msg.chat.id, `Статус лида ${leadId} в базе "${leadsDBName}" обновлен на ${getStatusName(newStatus)}.`);
  } catch (error) {
    logger.error('Error updating lead status:', error);
    bot.sendMessage(msg.chat.id, `Ошибка при обновлении статуса лида: ${error.message}`);
  }
},

'/delete_lead (.+) ([0-9]+)': async (bot, msg, match) => {
    const [, leadsDBName, leadId] = match;
    try {
      await LeadsService.deleteLeadByName(msg.from.id, leadsDBName, parseInt(leadId));
      bot.sendMessage(msg.chat.id, `Лид с ID ${leadId} успешно удален из базы "${leadsDBName}".`);
    } catch (error) {
      logger.error('Error deleting lead:', error);
      bot.sendMessage(msg.chat.id, `Ошибка при удалении лида: ${error.message}`);
    }
  },

  '/set_default_leadsdb (.+)': async (bot, msg, match) => {
    const [, leadsDBName] = match;
    try {
      await LeadsService.setDefaultLeadsDBByName(msg.from.id, leadsDBName);
      bot.sendMessage(msg.chat.id, `База лидов "${leadsDBName}" установлена как дефолтная для входящих лидов из CRM.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка: ${error.message}`);
    }
  },

  '/get_default_leadsdb': async (bot, msg) => {
    try {
      const defaultLeadsDB = await LeadsService.getOrCreateDefaultLeadsDB(msg.from.id);
      bot.sendMessage(msg.chat.id, `Текущая дефолтная база лидов: ${defaultLeadsDB.name} (ID: ${defaultLeadsDB.id})`);
    } catch (error) {
      logger.error('Error getting default LeadsDB:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении информации о дефолтной базе лидов. Пожалуйста, попробуйте позже.');
    }
  },

  // Обработчик для всех текстовых сообщений
  messageHandler: async (bot, msg) => {
    const userId = msg.from.id;
    const userState = getUserState(userId);

    logger.info(`Received message with ${userState} and ${userState?.action}`);

    if (userState && userState.action === 'upload_leads_to_db') {
      logger.info(`XLS file is ${msg.document?.mime_type}`);
      if (msg.document && (msg.document.mime_type === 'application/vnd.ms-excel' || msg.document.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        try {
          const file = await bot.getFileLink(msg.document.file_id);
          const leads = await processExcelFile(file);
          const addedLeadsCount = await LeadsService.addLeadsToLeadsDB(parseInt(userState.leadsDBId), leads);
    
          bot.sendMessage(msg.chat.id, `Лиды успешно загружены в базу лидов (ID: ${userState.leadsDBId}). Добавлено ${addedLeadsCount} новых лидов.`);
        } catch (error) {
          logger.error('Error processing Excel file:', error);
          bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке Excel файла.');
        }
        clearUserState(userId);
      } else {
        bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте Excel файл (XLS или XLSX).');
      }
    }
  },
};