// src/services/leads/src/xlsProcessor.js

const xlsx = require('xlsx');
const axios = require('axios');

const logger = require('../../../utils/logger');

async function processExcelFile(fileUrl) {
  try {
    logger.info(`Начало обработки Excel файла: ${fileUrl}`);
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const leads = data
      .map((row) => ({
        phone: row['Телефон'] ? row['Телефон'].toString() : null,
        name: row['Имя'] || null,
        source: row['Источник'] || null,
      }))
      .filter((lead) => lead.phone);

    logger.info(`Обработано ${leads.length} лидов из Excel файла`);
    return leads;
  } catch (error) {
    logger.error('Ошибка при обработке Excel файла:', error);
    throw error;
  }
}

module.exports = { processExcelFile };
