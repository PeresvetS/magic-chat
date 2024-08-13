// src/services/gpt/gptService.js

const { Configuration, OpenAIApi } = require("openai");
const config = require('../../../config');

const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function generateResponse(messages, systemPrompt) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating GPT response:', error);
    throw error;
  }
}

module.exports = { generateResponse };