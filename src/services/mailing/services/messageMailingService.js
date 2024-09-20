// src/services/mailing/services/MessageMailingService.js

const logger = require('../../../utils/logger');
const { WABASessionService } = require('../../waba');
const { leadService } = require('../../leads/src/leadService');
const { TelegramSessionService } = require('../../telegram');
const { WhatsAppSessionService } = require('../../whatsapp');
const { Api } = require('telegram/tl');
const {
  getCampaigUserId,
} = require('../../campaign/src/campaignsMailingService');
const { saveDialog, chetkIsNewContact } = require('../../dialog/dialogService');
const { updateMessagePhoneNumberCount, checkDailyPhoneNumberLimit } =
  require('../../phone').phoneNumberService;
const {
  formatPhoneNumberForWhatsApp,
  applyDelay,
} = require('../../../utils/phoneHelpers');

async function sendTelegramMessage({
  campaignId,
  senderPhoneNumber,
  recipientPhoneNumber,
  message,
}) {
  try {
    const result = await TelegramSessionService.sendTelegramMessage(recipientPhoneNumber, senderPhoneNumber, campaignId, message);
    return { success: true, messageId: result.id, status: 'completed' };
  } catch (error) {
    logger.error(`Error sending Telegram message for campaign ${campaignId} to ${recipientPhoneNumber}:`, error);
    return { success: false, error: error.message, status: 'failed' };
  }
}

async function sendWABAMessage({
  campaignId,
  senderPhoneNumber,
  recipientPhoneNumber,
  message,
}) {
  logger.info(
    `Отправка сообщения WABA с ID кампании ${campaignId} от ${senderPhoneNumber} к ${recipientPhoneNumber}`,
  );
  try {
    const userId = await getCampaigUserId(campaignId);
    logger.info(`Отправка рассылки от пользователя ID с ${userId}`);

    if (!(await checkDailyPhoneNumberLimit(senderPhoneNumber, 'waba'))) {
      logger.warn(
        `Достигнут дневной лимит WABA для номера телефона: ${senderPhoneNumber}`,
      );
      return { success: false, error: 'DAILY_LIMIT_REACHED' };
    }

    const client =
      await WABASessionService.createOrGetSession(senderPhoneNumber);

    await applyDelay('waba');

    const result = await client.sendMessage(recipientPhoneNumber, message);

    await leadService.updateOrCreateLeadChatId(
      campaignId,
      recipientPhoneNumber,
      result.id,
      'waba',
    );

    const isNewContact = await chetkIsNewContact(
      userId,
      recipientPhoneNumber,
      'waba',
    );
    await updateMessagePhoneNumberCount(
      senderPhoneNumber,
      isNewContact,
      'waba',
    );
    await saveDialog(
      userId,
      recipientPhoneNumber,
      'waba',
      '',
      message,
      recipientPhoneNumber,
    );
    logger.info(
      `Сообщение отправлено на ${recipientPhoneNumber} через WABA с ${senderPhoneNumber}`,
    );
    return { success: true, messageId: result.id };
  } catch (error) {
    logger.error(
      `Ошика отправки сообщения WABA для кампании ${campaignId} на ${recipientPhoneNumber}:`,
      error,
    );
    return { success: false, error: error.message };
  }
}

async function sendWhatsAppMessage({
  campaignId,
  senderPhoneNumber,
  recipientPhoneNumber,
  message,
}) {
  logger.info(
    `Отправка сообщения с ID кампании ${campaignId} от ${senderPhoneNumber} к ${recipientPhoneNumber}`,
  );
  try {
    const userId = await getCampaigUserId(campaignId);
    logger.info(`Отправка рассылки от пользователя ID с ${userId}`);

    if (!(await checkDailyPhoneNumberLimit(senderPhoneNumber, 'whatsapp'))) {
      logger.warn(
        `Достигнут дневной лимит WhatsApp для номера телефона: ${senderPhoneNumber}`,
      );
      return { success: false, error: 'DAILY_LIMIT_REACHED' };
    }

    const client =
      await WhatsAppSessionService.createOrGetSession(senderPhoneNumber);

    await applyDelay('whatsapp');

    const formattedNumber = formatPhoneNumberForWhatsApp(recipientPhoneNumber);
    logger.info(
      `Форматированный номер для отправки WhatsApp: ${formattedNumber}`,
    );

    const chat = await client.getChatById(formattedNumber);
    if (!chat) {
      await leadService.setLeadUnavailable(recipientPhoneNumber);
      throw new Error(`Не удалось найти чат ${formattedNumber} в WhatsApp`);
    }
    const result = await chat.sendMessage(message);

    await leadService.updateOrCreateLeadChatId(
      campaignId,
      recipientPhoneNumber,
      result.id.remote,
      'whatsapp',
    );

    const isNewContact = await chetkIsNewContact(
      userId,
      formattedNumber,
      'whatsapp',
    );
    await updateMessagePhoneNumberCount(
      senderPhoneNumber,
      isNewContact,
      'whatsapp',
    );
    await saveDialog(
      userId,
      formattedNumber,
      'whatsapp',
      '',
      message,
      recipientPhoneNumber,
    );
    logger.info(
      `Сообщение отправлено на ${recipientPhoneNumber} через WhatsApp с ${senderPhoneNumber}`,
    );
    return { success: true, messageId: result.id._serialized };
  } catch (error) {
    logger.error(
      `Ошибка отправки сообщения WhatsApp для кампании ${campaignId} на ${recipientPhoneNumber}:`,
      error,
    );
    return { success: false, error: error.message };
  }
}

async function sendTgAndWa({
  campaignId,
  senderPhoneNumber,
  recipientPhoneNumber,
  message,
}) {
  const telegramResult = await sendTelegramMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  );
  const whatsappResult = await sendWhatsAppMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  );

  if (!telegramResult.success && !whatsappResult.success) {
    return {
      success: false,
      error: telegramResult.error || whatsappResult.error,
    };
  }

  return {
    success: true,
    messageId: telegramResult.messageId || whatsappResult.messageId,
  };
}

async function sendTgAndWABA({
  campaignId,
  senderPhoneNumber,
  recipientPhoneNumber,
  message,
}) {
  const telegramResult = await sendTelegramMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  );
  const wabaResult = await sendWABAMessage(
    campaignId,
    senderPhoneNumber,
    recipientPhoneNumber,
    message,
  );

  if (!telegramResult.success && !wabaResult.success) {
    return {
      success: false,
      error: telegramResult.error || wabaResult.error,
    };
  }

  return {
    success: true,
    messageId: telegramResult.messageId || wabaResult.messageId,
  };
}

module.exports = {
  sendTelegramMessage,
  sendWABAMessage,
  sendWhatsAppMessage,
  sendTgAndWa,
  sendTgAndWABA,
};
