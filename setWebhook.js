const axios = require('axios');

const removeWebhook = async (botToken) => {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
    console.log(`Removing existing webhook for ${botToken}:`, response.data);
  } catch (error) {
    console.log(`Error: removing existing webhook for ${botToken}:`, error.message);
  }
};

const setTelegramWebhook = async (botToken, ngrokUrl) => {
  try {
    await removeWebhook(botToken);

    const response = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: ngrokUrl,
    });

    console.log(`Webhook is set ${botToken}:`, response.data);
  } catch (error) {
    console.log(`Error: cannot set webhook ${botToken}:`, error.message);
  }
};

const setupWebhooks = async () => {
  try {
    const { data } = await axios.get('http://host.docker.internal:4040/api/tunnels');
    const ngrokUrl = data.tunnels[0].public_url;

    const userBotToken = process.env.USER_BOT_TOKEN;
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;

    await Promise.all([
      setTelegramWebhook(userBotToken, ngrokUrl),
      setTelegramWebhook(adminBotToken, ngrokUrl),
    ]);

    console.log('All webhooks successfully set.');
  } catch (error) {
    console.log('Error: setup webhooks failed:', error.message);
  }
};

setupWebhooks();
