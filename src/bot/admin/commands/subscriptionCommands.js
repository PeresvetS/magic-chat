const { addUserSubscription, getUserSubscriptionInfo, updateUserSubscription } = require('../../../services/user/src/subscriptionService');
const { getUserByIdentifier } = require('../../../services/user/src/userService');
const logger = require('../../../utils/logger');

module.exports = {
  '/addsubscription ([\\w\\.@]+) (\\d+) (days|months) (repeat|once)': async (bot, msg, match) => {
    try {
      const [, userIdentifier, duration, unit, repeatType] = match;
      logger.info(`Adding subscription for user: ${userIdentifier}, duration: ${duration} ${unit}, repeat: ${repeatType}`);

      const durationDays = unit === 'months' ? parseInt(duration) * 30 : parseInt(duration);
      const isRepeating = repeatType === 'repeat';

      const user = await getUserByIdentifier(userIdentifier);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      await addUserSubscription(user.id, durationDays, isRepeating);
      
      bot.sendMessage(msg.chat.id, `Подписка для пользователя с ID ${user.id} успешно добавлена.`);
    } catch (error) {
      logger.error('Error in add subscription command:', error);
      bot.sendMessage(msg.chat.id, `Произошла ошибка при добавлении подписки: ${error.message}`);
    }
  },

  '/checksubscription ([\\w\\.@]+)': async (bot, msg, match) => {
    try {
      const [, userIdentifier] = match;
      logger.info(`Checking subscription for user: ${userIdentifier}`);

      const user = await getUserByIdentifier(userIdentifier);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      logger.info(`User found: ${JSON.stringify(user)}`);

      const subscriptionInfo = await getUserSubscriptionInfo(user.id);
      logger.info(`Subscription info: ${JSON.stringify(subscriptionInfo)}`);

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

  '/updatesubscription ([\\w\\.@]+) (-?\\d+) (days|months)': async (bot, msg, match) => {
    try {
      const [, userIdentifier, duration, unit] = match;
      const durationDays = unit === 'months' ? parseInt(duration) * 30 : parseInt(duration);

      const user = await getUserByIdentifier(userIdentifier);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      await updateUserSubscription(user.id, durationDays);
      
      if (durationDays > 0) {
        
        bot.sendMessage(msg.chat.id, `Подписка для пользователя с ID ${user.id} успешно обновлена. Добавлено ${durationDays} дней.`);
        ;
      } else if (durationDays < 0) {
        bot.sendMessage(msg.chat.id, `Подписка для пользователя с ID ${user.id} успешно обновлена. Удалено ${Math.abs(durationDays)} дней.`);
      } else {
        bot.sendMessage(msg.chat.id, `Подписка для пользователя с ID ${user.id} обнулена.`);
      }
    } catch (error) {
      logger.error('Error in update subscription command:', error);
      bot.sendMessage(msg.chat.id, `Произошла ошибка при обновлении подписки: ${error.message}`);
    }
  },
};