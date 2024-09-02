// src/bot/user/commands/mailingCommads.js

const { campaignsMailingService } = require('../../../services/campaign');
const { distributionService } = require('../../../services/mailing');
const { setUserState, clearUserState } = require('../utils/userState');
const { processExcelFile } = require('../../../services/crm');
const { promptService } = require('../../../services/prompt');
const logger = require('../../../utils/logger');

// Объект для хранения состояния пользователей
const userStates = {};

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
      userStates[msg.from.id] = {
        action: 'set_mc_message',
        campaignId: campaign.id,
        campaignName: campaignName
      };

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

      const phoneNumbers = await campaignsMailingService.getCampaignPhoneNumbers(campaign.id);
      if (phoneNumbers.length === 0) {
        bot.sendMessage(msg.chat.id, `У кампании "${campaignName}" нет прикрепленных номеров.`);
        return;
      }

      const phoneList = phoneNumbers.map(p => `${p.phoneNumber} (${p.platform})`).join('\n');
      bot.sendMessage(msg.chat.id, `Номера, прикрепленные к кампании "${campaignName}":\n${phoneList}`);
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


'/upload_leads ([^\\s]+)': async (bot, msg, match) => {
    const [, campaignName] = match;
    if (!campaignName) {
      bot.sendMessage(msg.chat.id, 'Пожалуйста, укажите название кампании. Например: /upload_leads МояКампания');
      return;
    }

    const userId = msg.from.id;

    // Устанавливаем состояние пользователя
    const newState = {
      action: 'upload_leads',
      campaignName: campaignName
    };
    setUserState(userId, newState);

    logger.info(`Set user state for ${userId}: ${JSON.stringify(newState)}`);

    bot.sendMessage(msg.chat.id, `Пожалуйста, отправьте Excel файл (XLS или XLSX) с лидами для кампании "${campaignName}"`);
  },
  
  
  // Обработчик для всех текстовых сообщений
  messageHandler: async (bot, msg) => {
    const userId = msg.from.id;
    const userState = userStates[userId];

    logger.info(`Received message with ${userState} and ${userState.action}`);

    if (userState && userState.action === 'set_mc_message') {
      try {
        await campaignsMailingService.setCampaignMessage(userState.campaignId, msg.text);
        bot.sendMessage(msg.chat.id, `Сообщение для кампании "${userState.campaignName}" установлено:\n${msg.text}`);
        
        // Очищаем состояние пользователя
        delete userStates[userId];
      } catch (error) {
        logger.error('Error setting campaign message:', error);
        bot.sendMessage(msg.chat.id, 'Произошла ошибка при установке сообщения кампании.');
      }
    }
    if (userState && userState.action === 'upload_leads') {
      logger.info(`XLS file is ${msg.document.mime_type}`);
      if (msg.document && msg.document.mime_type === 'application/vnd.ms-excel') {
        try {
          const campaign = await getCampaignByName(userState.campaignName, bot, msg.chat.id);
          if (!campaign) return;
    
          const file = await bot.getFileLink(msg.document.file_id);
          const leads = await processExcelFile(file);
          await campaignsMailingService.addLeadsToCampaign(campaign.id, leads);
    
          bot.sendMessage(msg.chat.id, `Лиды успешно загружены для кампании "${userState.campaignName}".`);
        } catch (error) {
          logger.error('Error processing XLS file:', error);
          bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке XLS файла.');
        }
        delete userStates[msg.from.id];
      } else {
        bot.sendMessage(msg.chat.id, 'Пожалуйста, отправьте XLS файл.');
      }
    }
  },


};