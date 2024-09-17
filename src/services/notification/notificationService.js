// src/services/notification/notificationService.js

const logger = require('../../utils/logger');
const { getUserByTgId } = require('../../db/repositories/userRepo');
const notificationBot = require('../../bot/notification/notificationBot');


async function sendNotification(updatedLead, campaign, lead, messages) {
    const recentMessages = messages.slice(-6);

    const messageHistory =
        recentMessages.length > 0
        ? recentMessages
            .map(
              (msg) => `${msg.role === 'human' ? '👤' : '🤖'} ${msg.content}`,
            )
            .join('\n\n')
        : 'История сообщений недоступна';

    const message = `
Новый успешный лид!

👤 Имя: ${updatedLead.name || 'Не указано'}
📞 Телефон: ${updatedLead.phone}
🏷️ Источник: ${updatedLead.source || 'Не указан'}
📅 Дата создания: ${updatedLead.createdAt.toLocaleString()}
🔗 Кампания: ${campaign.name}
🆔 ID лида: ${updatedLead.id}
${updatedLead.bitrixId ? `🔢 Bitrix ID: ${updatedLead.bitrixId}` : ''}

💬 Последнее сообщение: ${lead.lastMessageTime ? `${lead.lastMessageTime.toLocaleString()} через ${lead.lastPlatform}` : 'Нет данных'}

📜 Последние сообщения диалога:
${messageHistory}
    `;

    try {
      for (const telegramId of campaign.notificationTelegramIds) {
        await notificationBot.sendNotification(telegramId, message);
      }
      logger.info(
        `Notifications sent to ${campaign.notificationTelegramIds.length} recipients for lead ${updatedLead.id}`,
      );
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
}

module.exports = { sendNotification };
