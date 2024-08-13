// // src/services/parsing/userParser/bioEvaluator.js

// const OpenAI = require("openai");
// const config = require('../../../config');
// const logger = require('../../../utils/logger');

// class BioEvaluator {
//   constructor() {
//     this.openai = new OpenAI({
//       apiKey: config.OPENAI_API_KEY
//     });
//   }

//   async evaluateBio(bio, audienceDescription) {
//     try {
//       const completion = await this.openai.chat.completions.create({
//         model: "gp-4o-mini",
//         messages: [
//           {
//             role: "system",
//             content: "Вы - эксперт по оценке соответствия биографий целевой аудитории. Ваша задача - оценить насколько био пользователя соответствует описанию целевой аудитории по шкале от 0 до 1."
//           },
//           {
//             role: "user",
//             content: `Оцените соответствие био пользователя "${bio}" описанию целевой аудитории "${audienceDescription}". Ответьте числом от 0 до 1, где 0 - полное несоответствие, 1 - полное соответствие.`
//           }
//         ],
//         max_tokens: 5,
//         temperature: 0.5,
//       });

//       const score = parseFloat(completion.choices[0].message.content.trim());
//       return isNaN(score) ? 0 : score;
//     } catch (error) {
//       logger.error('Error evaluating bio with OpenAI:', error);
//       return 0;
//     }
//   }
// }

// module.exports = BioEvaluator;