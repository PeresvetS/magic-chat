// src/bot/user/commands/helpCommands.js

module.exports = {
    '/help': async (bot, msg) => {
      const helpText = `
  Доступные команды:
  /addphone [номер] - Добавить новый телефон
  /removephone [номер] - Удалить телефон
  /listphones - Показать список телефонов
  /checksubscription - Показать информацию о подписке
  /help - Показать эту справку
      `;
      bot.sendMessage(msg.chat.id, helpText);
    }
  };


  //   /startparsing [группа] - Начать парсинг группы
  // /stopparsing - Остановить текущий парсинг
  // /parsingstatus - Показать статус парсинга
  // /createcampaign [название] - Создать новую кампанию
  // /listcampaigns - Показать список кампаний
  // /campaignstats [id] - Показать статистику кампании