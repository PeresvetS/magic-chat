// src/services/gpt/gptService.js

const OpenAI = require("openai");
const config = require('../../config');
const logger = require('../../utils/logger');

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

async function generateResponse(messages, systemPrompt) {
  try {
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'human' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    logger.info(`Sending request to OpenAI with messages: ${JSON.stringify(formattedMessages)}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: formattedMessages,
    });

    return response.choices[0].message.content;
  } catch (error) {
    logger.error('Error generating GPT response:', error);
    throw error;
  }
}

module.exports = { generateResponse };