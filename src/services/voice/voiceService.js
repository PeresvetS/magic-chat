// src/services/voice/voiceService.js

const Groq = require('groq-sdk');
const axios = require('axios');
const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');
const path = require('path');
const logger = require('../../utils/logger');
const config = require('../../config');

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

async function transcribeAudio(fileUrl) {
  if (!fileUrl) {
    throw new Error('File URL is undefined');
  }
  
  logger.info(`Начало транскрипции аудио файла: ${fileUrl}`);
  try {
    // Проверяем, является ли fileUrl локальным путем
    if (fileUrl.startsWith('/')) {
      // Проверяем существование и размер файла
      const stats = await fsPromises.stat(fileUrl);
      if (stats.size === 0) {
        throw new Error(`File is empty: ${fileUrl}`);
      }

      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(fileUrl),
        model: "whisper-large-v3",
        language: "ru",
      });
      
      logger.info('Аудио успешно транскрибировано');
      return transcription.text;
    } else {
      // Если это URL, сначала скачиваем файл
      const tempFilePath = await downloadFile(fileUrl);
      
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-large-v3",
        language: "ru",
      });
      
      await fsPromises.unlink(tempFilePath);
      
      logger.info('Аудио успешно транскрибировано');
      return transcription.text;
    }
  } catch (error) {
    logger.error('Ошибка при транскрипции аудио:', error);
    throw new Error('Не удалось транскрибировать аудио: ' + error.message);
  }
}

async function downloadFile(fileUrl) {
  const response = await axios({
    method: 'GET',
    url: fileUrl,
    responseType: 'arraybuffer'
  });

  const tempFilePath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.ogg`);
  await fsPromises.writeFile(tempFilePath, response.data);

  return tempFilePath;
}

module.exports = {
  transcribeAudio,
};