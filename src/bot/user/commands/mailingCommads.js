// src/bot/user/commands/mailingCommads.js

const { setUserState, getUserState, clearUserState } = require('../utils/userState');
const LeadsService = require('../../../services/leads/src/LeadsService');
const { campaignsMailingService } = require('../../../services/campaign');
const { distributionService } = require('../../../services/mailing');
const { promptService } = require('../../../services/prompt');
const logger = require('../../../utils/logger');


async function getCampaignByName(name, bot, chatId) {
  try {
    const campaign = await campaignsMailingService.getCampaignByName(name);
    if (!campaign) {
      bot.sendMessage(chatId, `Кампания "${name}" не найдена.`);
      return null;
    }
    return campaign;
  } catch (error) {
    logger.error('Error getting campaign:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при получении информации о кампании.');
    return null;
  }
}

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

  '/create_mc ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;

    logger.info(`User ${msg.from.id} attempting to create campaign ${campaignName}`);
    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /create_mc МояКампания');
      return;
    }

    try {
      const campaign = await campaignsMailingService.createCampaign(msg.from.id, campaignName);
      bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" успешно создана. ID: ${campaign.id}`);
    } catch (error) {
      logger.error('Error creating campaign:', error);
      if (error.message.includes('User with Telegram ID')) {
        bot.sendMessage(msg.chat.id, 'Ошибка: Ваш пользователь не найден в системе. Пожалуйста, свяжитесь с администратором.');
      } else {
        bot.sendMessage(msg.chat.id, 'Произошла ошибка при создании кампании. Пожалуйста, попробуйте позже.');
      }
    }
  },

  '/set_google_sheet ([^\\s]+) (.+)': async (bot, msg, match) => {
    const [, campaignName, googleSheetUrl] = match;

    if (!campaignName || !googleSheetUrl) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и URL Google таблицы. Например: /set_google_sheet МояКампания https://docs.google.com/spreadsheets/d/...');
      return;
    }

    try {
      const campaign = await campaignsMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      // Простая проверка формата URL
      if (!googleSheetUrl.startsWith('https://docs.google.com/spreadsheets/d/')) {
        bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите корректный URL Google таблицы.');
        return;
      }

      await campaignsMailingService.setGoogleSheetUrl(campaign.id, googleSheetUrl);
      bot.sendMessage(msg.chat.id, `Google таблица успешно подключена к кампании "${campaignName}".`);
    } catch (error) {
      logger.error('Error setting Google Sheet URL:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при подключении Google таблицы. Пожалуйста, попробуйте позже.');
    }
  },

  '/set_mc_message ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;

    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /set_mc_message МояКампания');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) {
        return;
      }

      // Устанавливаем состояние пользователя
      setUserState(msg.from.id, {
        action: 'set_mc_message',
        campaignId: campaign.id,
        campaignName: campaignName
      });

      bot.sendMessage(msg.chat.id, `Пожалуйста, отправьте сообщение для кампании "${campaignName}"`);
    } catch (error) {
      logger.error('Error preparing to set campaign message:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при подготовке к установке сообщения кампании.');
    }
  },


  '/get_mc ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;
    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании.');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);

      const status = campaign.isActive ? 'активна' : 'неактивна';
      bot.sendMessage(msg.chat.id, `Кампания: ${campaign.name}\nСтатус: ${status}\nПриоритетная платформа: ${campaign.platformPriority}\n\nСообщение:\n${campaign.message || 'Не установлено'}`);
    } catch (error) {
      logger.error('Error getting campaign:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении информации о кампании.');
    }
  },

  '/list_mc': async (bot, msg) => {
    try {
      const campaigns = await campaignsMailingService.listCampaigns(msg.from.id);
      if (campaigns.length === 0) {
        bot.sendMessage(msg.chat.id, 'У вас нет созданных кампаний.');
        return;
      }

      const campaignList = campaigns.map(c => `- ${c.name} (${c.isActive ? 'активна' : 'неактивна'})`).join('\n');
      bot.sendMessage(msg.chat.id, `Ваши кампании:\n${campaignList}`);
    } catch (error) {
      logger.error('Error listing campaigns:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка кампаний.');
    }
  },

  '/mailing_test ([+]?[0-9]+)(?:\\s(telegram|whatsapp|tgwa))?': async (bot, msg, match) => {
  const [, phoneNumber, priorityPlatform] = match;

    if (!phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите номер телефона после команды.');
      return;
    }

    try {
      const activeCampaign = await campaignsMailingService.getActiveCampaign(msg.chat.id);
      if (!activeCampaign) {
        bot.sendMessage(msg.chat.id, 'Нет активной кампании для рассылки.');
        return;
      }

      if (!activeCampaign.message) {
        bot.sendMessage(msg.chat.id, 'У активной кампании не установлено сообщение для рассылки.');
        return;
      }

      const result = await distributionService.distributeMessage(activeCampaign.id, activeCampaign.message, phoneNumber, priorityPlatform || activeCampaign.platformPriority);
      if (result.telegram && result.telegram.success) {
        bot.sendMessage(msg.chat.id, `Тестовое сообщение успешно отправлено в Telegram на номер ${phoneNumber}`);
      } 
      else if (result.whatsapp && result.whatsapp.success) {
        bot.sendMessage(msg.chat.id, `Тестовое сообщение успешно отправлено в WhatsApp на номер ${phoneNumber}`);
      } 
      else if (result.tgwa && result.tgwa.success) {
        bot.sendMessage(msg.chat.id, `Тестовое сообщение успешно отправлено в Telegram и/или WhatsApp на номер ${phoneNumber}`);
      }
      else {
        bot.sendMessage(msg.chat.id, `Не удалось отправить тестовое сообщение на номер ${phoneNumber}. Проверьте, доступен ли этот номер в мессенджерах.`);
      }
    } catch (error) {
      logger.error('Error in mailing test:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при отправке тестового сообщения.');
    }
  },

  '/send_manual_mc ([^\\s]+) ([+]?[0-9]+)(?:\\s(telegram|whatsapp|tgwa))?': async (bot, msg, match) => {
    const [, campaignName, phoneNumber, priorityPlatform] = match;

    if (!campaignName || !phoneNumber) {  
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и номер телефона. Например: /send_manual_mc МояКампания +79123456789');
      return;
    }

    try {
      const campaign = await campaignsMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      if (!campaign.message) {
        bot.sendMessage(msg.chat.id, `У кампании "${campaignName}" не установлено сообщение для рассылки.`);
        return;
      }

      const result = await distributionService.distributeMessage(campaign.id, campaign.message, phoneNumber, priorityPlatform || campaign.priorityPlatform);
      if (result.telegram && result.telegram.success) {
        bot.sendMessage(msg.chat.id, `Сообщение успешно отправлено в Telegram на номер ${phoneNumber}`);
      } 
      else if (result.whatsapp && result.whatsapp.success) {
        bot.sendMessage(msg.chat.id, `Сообщение успешно отправлено в WhatsApp на номер ${phoneNumber}`);
      }
      else if (result.tgwa && result.tgwa.success) {
        bot.sendMessage(msg.chat.id, `Сообщение успешно отправлено в Telegram и/или WhatsApp на номер ${phoneNumber}`);
      } 
      else {
        bot.sendMessage(msg.chat.id, `Не удалось отправить сообщение на номер ${phoneNumber}. Проверьте, доступен ли этот номер в мессенджерах.`);
      }
    } catch (error) {
      logger.error('Error in manual send:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при отправке сообщения.');
    }
  },


  '/set_platform_priority_mc ([^\\s]+)(?:\\s(telegram|whatsapp|tgwa))?': async (bot, msg, match) => {
    const [, campaignName, platformPriority] = match;
    if (!campaignName || !platformPriority) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и приоритет платформы. Например: /set_platform_priority МояКампания telegram');
      return;
    }

    if (!['telegram', 'whatsapp', 'TgAndWa'].includes(platformPriority)) {
      bot.sendMessage(msg.chat.id, 'Неверный приоритет платформы. Допустимые значения: telegram, whatsapp, TgAndWa');
      return;
    }

    try {
      const campaign = await campaignsMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      await campaignsMailingService.setPlatformPriority(campaign.id, platformPriority);
      bot.sendMessage(msg.chat.id, `Приоритет платформы для кампании "${campaignName}" установлен на ${platformPriority}.`);
    } catch (error) {
      logger.error('Error setting platform priority:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при установке приоритета платформы.');
    }
  },

  
  '/attach_phone_mc ([^\\s]+) ([+]?[0-9]+) (telegram|whatsapp|tgwa)': async (bot, msg, match) => {
    const [, campaignName, phoneNumber, platform] = match;
    logger.info('Attaching phone number to campaign:', campaignName, phoneNumber, platform);
    if (!campaignName || !phoneNumber || !platform) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании, номер телефона и платформу. Например: /attach_phone_mc МояКампания +79123456789 telegram');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      await campaignsMailingService.attachPhoneNumber(campaign.id, phoneNumber, platform);
      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} успешно прикреплен к кампании "${campaignName}" для платформы ${platform}.`);

    } catch (error) {
      logger.error('Error attaching phone number to campaign:', error);
      if (error.message === 'Phone number does not exist') {
        bot.sendMessage(msg.chat.id, 'Ошибка: Указанный номер телефона не существует в системе.');
      } 
      else if (error.message === 'Phone number is not authenticated') {
        bot.sendMessage(msg.chat.id, 'Ошибка: Указанный номер телефона не аутентифицирован.');
      } 
      else if (error.message === 'Phone number is already attached to another campaign') {
        bot.sendMessage(msg.chat.id, 'Ошибка: Указанный номер телефона уже прикреплен к другой кампании. Открепите его сначала.');
      } 
      else {
        bot.sendMessage(msg.chat.id, 'Произошла ошибка при прикреплении номера к кампании.');
      }
    }
  },

  '/toggle_mc ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;
    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании.');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      const updatedCampaign = await campaignsMailingService.toggleCampaignActivity(campaign.id, !campaign.isActive);
      const status = updatedCampaign.isActive ? 'активирована' : 'деактивирована';
      bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" ${status}.`);
    } catch (error) {
      logger.error('Error toggling campaign:', error);
      if (error.message.includes('Cannot activate campaign without attached phone numbers')) {
        bot.sendMessage(msg.chat.id, 'Невозможно активировать кампанию без прикрепленных номеров телефонов.');
      } else if (error.message.includes('Cannot activate campaign with unauthenticated phone numbers')) {
        bot.sendMessage(msg.chat.id, 'Невозможно активировать кампанию с неаутентифицированными номерами телефонов.');
      } else {
        bot.sendMessage(msg.chat.id, 'Произошла ошибка при изменении статуса кампании.');
      }
    }
  },

  '/list_phones_mc ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;

    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /list_phones_mc МояКампания');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      const { phoneNumbers, defaultTelegramNumber, defaultWhatsappNumber } = await campaignsMailingService.getCampaignPhoneNumbers(campaign.id);
      
      if (phoneNumbers.length === 0) {
        bot.sendMessage(msg.chat.id, `У кампании "${campaignName}" нет прикрепленных номеров.`);
        return;
      }

      let message = `Номера, прикрепленные к кампании "${campaignName}":\n`;
      phoneNumbers.forEach(p => {
        let status = '';
        if (p.phoneNumber === defaultTelegramNumber && p.platform === 'telegram') {
          status = ' (дефолтный для Telegram)';
        } else if (p.phoneNumber === defaultWhatsappNumber && p.platform === 'whatsapp') {
          status = ' (дефолтный для WhatsApp)';
        }
        message += `${p.phoneNumber} (${p.platform})${status}\n`;
      });

      if (!defaultTelegramNumber) {
        message += '\nДля Telegram не установлен дефолтный номер.';
      }
      if (!defaultWhatsappNumber) {
        message += '\nДля WhatsApp не установлен дефолтный номер.';
      }

      bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      logger.error('Error listing campaign phone numbers:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка номеров кампании.');
    }
  },

  
  '/detach_phone_mc ([^\\s]+) ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, campaignName, phoneNumber] = match;

    if (!campaignName || !phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и номер телефона. Например: /detach_phone_mc МояКампания +79123456789');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      await campaignsMailingService.detachPhoneNumber(campaign.id, phoneNumber);
      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} успешно откреплен от кампании "${campaignName}".`);
    } catch (error) {
      logger.error('Error detaching phone number from campaign:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при откреплении номера от кампании.');
    }
  },

  '/set_campaign_prompt ([^\\s]+) ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName, promptName] = match;
    if (!campaignName || !promptName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и название промпта. Например: /set_campaign_prompt МояКампания МойПромпт');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      const prompt = await promptService.getPromptByName(promptName);
      if (!prompt) {
        bot.sendMessage(msg.chat.id, `Промпт "${promptName}" не найден.`);
        return;
      }

      await campaignsMailingService.setCampaignPrompt(campaign.id, prompt.id);
      bot.sendMessage(msg.chat.id, `Промпт "${promptName}" успешно установлен для кампании "${campaignName}".`);
    } catch (error) {
      logger.error('Error setting campaign prompt:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при установке промпта для кампании.');
    }
  },


'/view_leads ([^\\s]+)': async (bot, msg, match) => {
  const [, campaignName] = match;
  if (!campaignName) {
    bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /view_leads МояКампания');
    return;
  }

  try {
    const campaign = await campaignsMailingService.getCampaignByName(campaignName);
    if (!campaign) {
      bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
      return;
    }

    const attachedLeadsDBs = await LeadsService.getAttachedLeadsDBs(campaign.id);
    let message = `Лиды для кампании "${campaignName}":\n\n`;

    for (const leadsDB of attachedLeadsDBs) {
      message += `База лидов: ${leadsDB.name} (ID: ${leadsDB.id})\n`;
      const statuses = ['NEW', 'UNAVAILABLE', 'PROCESSED_NEGATIVE', 'PROCESSED_POSITIVE'];

      for (const status of statuses) {
        const leads = await LeadsService.getLeadsFromLeadsDB(leadsDB.id, status);
        message += `  ${getStatusName(status)} (${leads.length}):\n`;
        leads.slice(0, 5).forEach(lead => {
          message += `  - ${lead.phone} ${lead.name ? `(${lead.name})` : ''}\n`;
        });
        if (leads.length > 5) {
          message += `  ... и еще ${leads.length - 5}\n`;
        }
        message += '\n';
      }
      message += '\n';
    }

    if (attachedLeadsDBs.length === 0) {
      message += 'К этой кампании не прикреплены базы лидов.';
    }

    bot.sendMessage(msg.chat.id, message);
  } catch (error) {
    logger.error('Error viewing leads:', error);
    bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка лидов. Пожалуйста, попробуйте позже.');
  }
},


'/send_mc_to_leads ([^\\s]+) (NEW|UNAVAILABLE|PROCESSED_NEGATIVE|PROCESSED_POSITIVE)': async (bot, msg, match) => {
  const [, campaignName, status] = match;
  
  if (!campaignName || !status) {
    bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и статус лидов. Например: /send_mc_to_leads МояКампания NEW');
    return;
  }

  try {
    const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
    if (!campaign) return;

    if (!campaign.message) {
      bot.sendMessage(msg.chat.id, `У кампании "${campaignName}" не установлено сообщение для рассылки.`);
      return;
    }

    const attachedLeadsDBs = await LeadsService.getAttachedLeadsDBs(campaign.id);
    if (attachedLeadsDBs.length === 0) {
      bot.sendMessage(msg.chat.id, `К кампании "${campaignName}" не прикреплены базы лидов.`);
      return;
    }

    let allLeads = [];
    for (const leadsDB of attachedLeadsDBs) {
      const leads = await LeadsService.getLeadsFromLeadsDB(leadsDB.id, status);
      allLeads = allLeads.concat(leads);
    }

    if (allLeads.length === 0) {
      bot.sendMessage(msg.chat.id, `Нет лидов со статусом ${getStatusName(status)} для рассылки.`);
      return;
    }

    bot.sendMessage(msg.chat.id, `Начинаем рассылку для ${allLeads.length} лидов со статусом ${getStatusName(status)}...`);

    const contacts = allLeads.map(lead => ({ phoneNumber: lead.phone }));
    const results = await distributionService.bulkDistribute(campaign.id, contacts, campaign.message, campaign.platformPriority);

    const summaryMessage = `Рассылка для кампании "${campaignName}" завершена.\n` +
                           `Всего лидов со статусом ${getStatusName(status)}: ${results.totalContacts}\n` +
                           `Успешно отправлено: ${results.successfulSends}\n` +
                           `Не удалось отправить: ${results.failedSends}`;

    bot.sendMessage(msg.chat.id, summaryMessage);

    // Отправка детальной информации, если есть ошибки
    if (results.failedSends > 0) {
      const failedDetails = results.details
        .filter(detail => detail.status === 'failed')
        .map(detail => `${detail.phoneNumber}: ${detail.error}`)
        .join('\n');
      
      bot.sendMessage(msg.chat.id, `Детали неудачных отправок:\n${failedDetails}`);
    }
  } catch (error) {
    logger.error('Error in send_mc_to_leads:', error);
    bot.sendMessage(msg.chat.id, 'Произошла ошибка при выполнении рассылки. Пожалуйста, попробуйте позже.');
  }
},

'/add_notification_id ([^\\s]+) ([0-9]+)': async (bot, msg, match) => {
    const [, campaignName, telegramId] = match;

    if (!campaignName || !telegramId) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и Telegram ID. Например: /add_notification_id МояКампания 123456789');
      return;
    }

    try {
      const campaign = await campaignsMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      await campaignsMailingService.addNotificationTelegramId(campaign.id, telegramId);
      bot.sendMessage(msg.chat.id, `Telegram ID ${telegramId} успешно добавлен для уведомлений в кампании "${campaignName}".`);
    } catch (error) {
      logger.error('Error adding notification Telegram ID:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при добавлении Telegram ID для уведомлений. Пожалуйста, попробуйте позже.');
    }
  },

  '/remove_notification_id ([^\\s]+) ([0-9]+)': async (bot, msg, match) => {
    const [, campaignName, telegramId] = match;

    if (!campaignName || !telegramId) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и Telegram ID. Например: /remove_notification_id МояКампания 123456789');
      return;
    }

    try {
      const campaign = await campaignsMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      await campaignsMailingService.removeNotificationTelegramId(campaign.id, telegramId);
      bot.sendMessage(msg.chat.id, `Telegram ID ${telegramId} успешно удален из уведомлений в кампании "${campaignName}".`);
    } catch (error) {
      logger.error('Error removing notification Telegram ID:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при удалении Telegram ID из уведомлений. Пожалуйста, попробуйте позже.');
    }
  },

  '/list_notification_ids ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;

    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /list_notification_ids МояКампания');
      return;
    }

    try {
      const campaign = await campaignsMailingService.getCampaignByName(campaignName);
      if (!campaign) {
        bot.sendMessage(msg.chat.id, `Кампания "${campaignName}" не найдена.`);
        return;
      }

      const notificationIds = await campaignsMailingService.getNotificationTelegramIds(campaign.id);
      if (notificationIds.length === 0) {
        bot.sendMessage(msg.chat.id, `Для кампании "${campaignName}" не установлены Telegram ID для уведомлений.`);
      } else {
        const idList = notificationIds.join(', ');
        bot.sendMessage(msg.chat.id, `Telegram ID для уведомлений в кампании "${campaignName}":\n${idList}`);
      }
    } catch (error) {
      logger.error('Error listing notification Telegram IDs:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка Telegram ID для уведомлений. Пожалуйста, попробуйте позже.');
    }
  },

  '/set_default_phone_mc ([^\\s]+) ([+]?[0-9]+)': async (bot, msg, match) => {
    const [, campaignName, phoneNumber] = match;

    if (!campaignName || !phoneNumber) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании и номер телефона. Например: /set_default_phone_mc МояКампания +79123456789');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      await campaignsMailingService.setDefaultPhoneNumber(campaign.id, phoneNumber);
      bot.sendMessage(msg.chat.id, `Номер ${phoneNumber} успешно установлен как дефолтный для кампании "${campaignName}".`);
    } catch (error) {
      logger.error('Error setting default phone number:', error);
      bot.sendMessage(msg.chat.id, `Ошибка при установке дефолтного номера: ${error.message}`);
    }
  },

  '/get_default_phone_mc ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;

    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /get_default_phone_mc МояКампания');
      return;
    }

    try {
      const campaign = await getCampaignByName(campaignName, bot, msg.chat.id);
      if (!campaign) return;

      const defaultPhoneNumber = await campaignsMailingService.getDefaultPhoneNumber(campaign.id);
      if (defaultPhoneNumber) {
        bot.sendMessage(msg.chat.id, `Дефолтный номер для кампании "${campaignName}": ${defaultPhoneNumber}`);
      } else {
        bot.sendMessage(msg.chat.id, `Для кампании "${campaignName}" не установлен дефолтный номер.`);
      }
    } catch (error) {
      logger.error('Error getting default phone number:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении дефолтного номера.');
    }
  },


  // Обработчик для всех текстовых сообщений
  messageHandler: async (bot, msg) => {
    const userId = msg.from.id;
    const userState = getUserState(userId);

    logger.info(`Received message with userState: ${JSON.stringify(userState)}`);

    if (userState && userState.action === 'set_mc_message') {
      try {
        await campaignsMailingService.setCampaignMessage(userState.campaignId, msg.text);
        bot.sendMessage(msg.chat.id, `Сообщение для кампании "${userState.campaignName}" установлено:\n${msg.text}`);
        
        // Очищаем состояние пользователя
        clearUserState(userId);
      } catch (error) {
        logger.error('Error setting campaign message:', error);
        bot.sendMessage(msg.chat.id, 'Произошла ошибка при установке сообщения кампании.');
      }
    } else {
      logger.info(`No matching action found for user ${userId}`);
    }
  },

};



