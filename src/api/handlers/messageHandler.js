// src/api/handlers/messageHandler.js

const { processMessage } = require('../../services/messaging');
const { getPhoneNumber } = require('../../services/phone').phoneNumberService;
const logger = require('../../utils/logger');

const handleSendMessage = (activeConversations) => async (req, res) => {
  const { recipientPhone, platform, message, conversationId, serviceUrl } = req.body;

  logger.info('Получен запрос на отправку сообщения', { recipientPhone, platform, conversationId });

  if (!recipientPhone || !platform || !message || !conversationId || !serviceUrl) {
    logger.warn('Неполные данные в запросе');
    return res.status(400).json({ error: 'Неполные данные в запросе' });
  }

  if (platform !== 'telegram') {
    logger.warn('Попытка использования неподдерживаемой платформы', { platform });
    return res.status(400).json({ error: 'Неподдерживаемая платформа' });
  }

  try {
    const senderPhone = await getPhoneNumber();
    if (!senderPhone) {
      logger.error('Номер телефона отправителя не настроен');
      return res.status(500).json({ error: 'Номер телефона отправителя не настроен' });
    }

    const user = await client.contacts.resolvePhone({ phone: recipientPhone });
    const chatId = user.id.toString();

    // Создаем или обновляем информацию о разговоре
    const conversation = activeConversations.get(chatId) || {};
    conversation.conversationId = conversationId;
    conversation.recipientPhone = recipientPhone;
    conversation.senderPhone = senderPhone;
    conversation.serviceUrl = serviceUrl;
    conversation.lastActivityTime = Date.now();
    activeConversations.set(chatId, conversation);

    // Отправляем сообщение
    const result = await processMessage(chatId, message);

    logger.info('Начата отправка сообщения', { 
      recipientPhone, 
      conversationId, 
      messageId: result.id 
    });

    res.json({ success: true, messageId: result.id });
  } catch (error) {
    logger.error('Ошибка при отправке сообщения', { 
      recipientPhone, 
      conversationId, 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ error: 'Не удалось отправить сообщение', details: error.message });
  }
};

module.exports = { handleSendMessage };