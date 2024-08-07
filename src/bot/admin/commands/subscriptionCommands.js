// src/bot/admin/commands/subscriptionCommands.js

const { addSubscription, getSubscriptionInfo, updateSubscription } = require('../../../services/user/subscriptionService');

module.exports = {
  '/addsubscription ([\\w\\.]+) (\\d+) (days|months) (repeat|once)': async (bot, msg, match) => {
    const [, userIdentifier, duration, unit, repeatType] = match;
    const durationDays = unit === 'days' ? parseInt(duration) : parseInt(duration) * 30;
    const isRepeating = repeatType === 'repeat';

    try {
      await addSubscription(userIdentifier, durationDays, isRepeating);
      bot.sendMessage(msg.chat.id, `Подписка добавлена для ${userIdentifier} на ${duration} ${unit}, ${isRepeating ? 'повторяемая' : 'однократная'}.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при добавлении подписки: ${error.message}`);
    }
  },

  '/subscriptioninfo ([\\w\\.]+)': async (bot, msg, match) => {
    const [, userIdentifier] = match;
    try {
      const info = await getSubscriptionInfo(userIdentifier);
      bot.sendMessage(msg.chat.id, `Информация о подписке:\n${JSON.stringify(info, null, 2)}`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при получении информации о подписке: ${error.message}`);
    }
  },

  '/updatesubscription ([\\w\\.]+) (\\d+) (days|months)': async (bot, msg, match) => {
    const [, userIdentifier, duration, unit] = match;
    const durationDays = unit === 'days' ? parseInt(duration) : parseInt(duration) * 30;

    try {
      await updateSubscription(userIdentifier, durationDays);
      bot.sendMessage(msg.chat.id, `Подписка обновлена для ${userIdentifier} на ${duration} ${unit}.`);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Ошибка при обновлении подписки: ${error.message}`);
    }
  }
};