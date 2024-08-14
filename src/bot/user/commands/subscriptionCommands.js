// src/bot/user/commands/subscriptionCommands.js

const { getUserSubscriptionInfo, getUserByTgId } = require('../../../services/user');
const logger = require('../../../utils/logger');

module.exports = {

  '/checksubscription': async (bot, msg, match) => {
    try {
      const user = await getUserByTgId(msg.from.id);
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      const subscriptionInfo = await getUserSubscriptionInfo(user.id);

      if (subscriptionInfo) {
        bot.sendMessage(msg.chat.id, `
          Информация о подписке для пользователя с ID ${user.id}:
          Дата окончания: ${subscriptionInfo.endDate}
          Повторяющаяся: ${subscriptionInfo.isRepeating ? 'Да' : 'Нет'}
          Осталось дней: ${subscriptionInfo.daysLeft}
        `);
      } else {
        bot.sendMessage(msg.chat.id, `У пользователя с ID ${user.id} нет активной подписки.`);
      }
    } catch (error) {
      logger.error('Error in check subscription command:', error);
      bot.sendMessage(msg.chat.id, `Произошла ошибка при проверке подписки: ${error.message}`);
    }
  },
};