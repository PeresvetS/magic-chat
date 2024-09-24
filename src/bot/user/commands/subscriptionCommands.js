// src/bot/user/commands/subscriptionCommands.js

const { getUserSubscriptionInfo } =
  require('../../../services/user/src/subscriptionService');
const { getUserByTgId } = require('../../../services/user/src/userService');
const logger = require('../../../utils/logger');

module.exports = {
  '/check_subscription': async (bot, msg, match) => {
    try {
      const user = await getUserByTgId(msg.from.id);

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      const subscriptionInfo = await getUserSubscriptionInfo(user.id);

      if (subscriptionInfo) {
        // Преобразуем BigInt в строку, если это необходимо
        const daysLeft = subscriptionInfo.daysLeft.toString();

        bot.sendMessage(
          msg.chat.id,
          `
          Информация о подписке для пользователя с ID ${user.id}:
          Дата окончания: ${subscriptionInfo.endDate}
          Повторяющаяся: ${subscriptionInfo.isRepeating ? 'Да' : 'Нет'}
          Осталось дней: ${daysLeft}
        `,
        );
      } else {
        bot.sendMessage(
          msg.chat.id,
          `У пользователя с ID ${user.id} нет активной подписки.`,
        );
      }
    } catch (error) {
      logger.error('Error in check subscription command:', error);
      bot.sendMessage(
        msg.chat.id,
        `Произошла ошибка при проверке подписки: ${error.message}`,
      );
    }
  },
};
