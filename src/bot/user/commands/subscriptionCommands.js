const { addUserSubscription, getUserSubscriptionInfo } = require('../../../services/user/src/subscriptionService');
const { getUserByIdentifier } = require('../../../services/user/src/userService');
const logger = require('../../../utils/logger');

module.exports = {

  '/checksubscription': async (bot, msg, match) => {
    const text = msg.text.split(' ');
    if (text.length !== 2) {
      bot.sendMessage(msg.chat.id, 'Неверный формат команды. Используйте: /checksubscription [user]');
      return;
    }
    const [, userIdentifier] = text;
    try {
      const user = await getUserByIdentifier(userIdentifier);
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