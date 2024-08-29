// src/bot/user/index.js

const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');
const { checkSubscription } = require('../../middleware/checkSubscription');
const phoneCommands = require('./commands/phoneCommands');
const { userService } = require('../../services/user');
// const parsingCommands = require('./commands/parsingCommands');
const mailingCommands = require('./commands/mailingCommads');
const helpCommands = require('./commands/helpCommands');
const subscriptionCommands = require('./commands/subscriptionCommands');
const { TelegramSessionService } = require('../../services/telegram');
const { WhatsAppSessionService } = require('../../services/whatsapp');
const logger = require('../../utils/logger');
const { setPhoneAuthenticated } = require('../../services/phone').phoneNumberService;
const crmSettingsCommands = require('./commands/crmSettingsCommands');
const { ftruncateSync } = require('fs');

function createUserBot() {
  const bot = new TelegramBot(config.USER_BOT_TOKEN, { polling: false });

  const commandModules = [
    phoneCommands,
    // parsingCommands,
    helpCommands,
    subscriptionCommands,
    mailingCommands,
    crmSettingsCommands
  ];

  commandModules.forEach(module => {
    Object.entries(module).forEach(([command, handler]) => {
      if (command !== 'messageHandler') {
        bot.onText(new RegExp(`^${command}`), async (msg, match) => {
          try {
            const userInfo = await userService.getUserInfo(msg.from.id);

            if (!userInfo || !userInfo.isSubscribed) {
              logger.info(`User ${user.id} does not have an active subscription`);
              bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для её оформления.');
              return;
            }
            
            logger.info(`Received command ${command} from user ${userInfo.id}`);
            
            if (userInfo.isBanned) {
              bot.sendMessage(msg.chat.id, 'Вы забанены администратором.');
              return;
            }

            await handler(bot, msg, match);
              
          } catch (error) {
            logger.error(`Error executing command ${command}:`, error);
            bot.sendMessage(msg.chat.id, `Произошла ошибка при выполнении команды: ${error.message}`);
          }
        });
      }
    });
  });

  // Обработчик для всех текстовых сообщений
  bot.on('text', async (msg) => {
    if (msg.text.startsWith('/')) return; // Игнорируем команды
    
    try {
      const userInfo = await userService.getUserInfo(msg.from.id);
      
      if (!userInfo || !userInfo.isSubscribed) {
        bot.sendMessage(msg.chat.id, 'У вас нет активной подписки. Обратитесь к администратору для её оформления.');
        return;
      }

      if (userInfo.isBanned) {
        bot.sendMessage(msg.chat.id, 'Вы забанены администратором.');
        return;
     }

      if (mailingCommands.messageHandler) {
        await mailingCommands.messageHandler(bot, msg);
      }

    } catch (error) {
      logger.error('Error handling message:', error);
      bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке сообщения.');
    }
  });


  bot.on('callback_query', async (query) => {
    const [action, authType, phoneNumber, platform] = query.data.split('_');
    logger.info(`Received callback query: ${query.data}`);

    if (action !== 'auth') {
      return;
    }

    switch (platform) {

      case 'telegram':
        await tryTelegramAuth(bot, query, phoneNumber, authType);
        break;
      case 'whatsapp':
        await tryWhatsappAuth(bot, query, phoneNumber, authType);
        break;
      default:
        bot.answerCallbackQuery(query.id, 'Неизвестная платформа');
        break;
        
    }

  });

  bot.on('polling_error', (error) => {
    logger.error('Polling error:', error);
    if (error.code === 'ETELEGRAM' && error.message.includes('Bad Gateway')) {
      logger.warn('Telegram API временно недоступен. Переподключение...');
      bot.stopPolling().then(() => {
        setTimeout(() => {
          bot.startPolling();
        }, 5000); // Попытка переподключения через 5 секунд
      });
    }
  });

  return {
    bot,
    launch: () => {
      logger.info('Starting bot polling');
      bot.startPolling();
      logger.info('Bot polling started successfully');
    },
    stop: () => {
      logger.info('Stopping bot polling');
      bot.stopPolling();
      logger.info('Bot polling stopped successfully');
    }
  };
}


async function tryTelegramAuth(bot, query, phoneNumber, authType) {
  if (authType === 'code') {
    try {
      logger.info(`Authenticating Telegram session for phone number ${phoneNumber}`);
      await TelegramSessionService.authenticateSession(phoneNumber, bot, query.message.chat.id);
      await setPhoneAuthenticated(phoneNumber, 'telegram', true);
      bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован в Telegram.`);
    } catch (error) {
      logger.error(`Error authenticating Telegram session for phone number ${phoneNumber}:`, error);
      bot.answerCallbackQuery(query.id, { text: `Ошибка при аутентификации номера в Telegram: ${error.message}` });
    }
  } else if (authType === 'qr') {
    try {
      logger.info(`Generating QR code for Telegram phone number ${phoneNumber}`);
      await TelegramSessionService.generateQRCode(phoneNumber, bot, query.message.chat.id);
      // Обработка успешной аутентификации через QR-код происходит внутри метода generateQRCode
    } catch (error) {
      logger.error(`Error generating QR code for Telegram phone number ${phoneNumber}:`, error);
      bot.answerCallbackQuery(query.id, { text: `Ошибка при генерации QR-кода для Telegram: ${error.message}` });
    }
  }
}

async function tryWhatsappAuth(bot, query, phoneNumber, authType) {
  if (authType === 'qr') {
    await bot.answerCallbackQuery(query.id);
    try {
      logger.info(`Starting WhatsApp authentication process for ${phoneNumber}`);

      const qrCode = await WhatsAppSessionService.generateQRCode(phoneNumber);
      logger.info(`QR code received: ${qrCode.substring(0, 20)}...`); // Выводим первые 20 символов QR-кода
      if (!qrCode) {
        throw new Error('Failed to generate QR code');
      }
      logger.info(`QR code generated for ${phoneNumber}`);

      await bot.sendPhoto(query.message.chat.id, Buffer.from(qrCode, 'base64'), {
        caption: 'Пожалуйста, отсканируйте этот QR-код в приложении WhatsApp для подключения. У вас есть 5 минут на сканирование.'
      });
      logger.info(`QR code sent to user for ${phoneNumber}`);

      await WhatsAppSessionService.waitForAuthentication(phoneNumber, async (isAuthenticated) => {
        if (isAuthenticated) {
          await bot.sendMessage(query.message.chat.id, `Номер телефона ${phoneNumber} успешно аутентифицирован в WhatsApp.`);
        } else {
          await bot.sendMessage(query.message.chat.id, `Не удалось аутентифицировать номер ${phoneNumber} в WhatsApp. Попробуйте еще раз.`);
        }
      });
      logger.info(`Authentication process completed for ${phoneNumber}`);
    } catch (error) {
      logger.error(`Error in WhatsApp authentication process for ${phoneNumber}:`, error);
      let errorMessage = 'Произошла ошибка при аутентификации WhatsApp. Попробуйте ещё раз.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Время ожидания аутентификации истекло. Пожалуйста, попробуйте еще раз.';
      } else if (error.message.includes('auth_failure')) {
        errorMessage = 'Ошибка аутентификации WhatsApp. Пожалуйста, убедитесь, что вы правильно отсканировали QR-код.';
      } else if (error.message.includes('Failed to generate QR code')) {
        errorMessage = 'Не удалось сгенерировать QR-код. Пожалуйста, попробуйте еще раз.';
      }
      await bot.sendMessage(query.message.chat.id, errorMessage);
    }
  }
}



module.exports = createUserBot();