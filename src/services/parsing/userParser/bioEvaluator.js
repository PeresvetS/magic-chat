// src/services/userParser/bioEvaluator.js

const { Configuration, OpenAIApi } = require("openai");
const config = require('../../config');
const logger = require('../../utils/logger');

class BioEvaluator {
  constructor() {
    this.openai = new OpenAIApi(new Configuration({ apiKey: config.OPENAI_API_KEY }));
  }

  async evaluateBio(bio, audienceDescription) {
    try {
      const completion = await this.openai.createCompletion({
        model: "text-davinci-002",
        prompt: `Оцените соответствие био пользователя "${bio}" описанию целевой аудитории "${audienceDescription}". Ответьте числом от 0 до 1, где 0 - полное несоответствие, 1 - полное соответствие.`,
        max_tokens: 1,
        n: 1,
        stop: null,
        temperature: 0.5,
      });

      return parseFloat(completion.data.choices[0].text.trim());
    } catch (error) {
      logger.error('Error evaluating bio with OpenAI:', error);
      return 0;
    }
  }
}

module.exports = BioEvaluator;