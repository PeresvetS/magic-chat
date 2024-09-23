// src/services/llm/utils/getDocsData.js

const axios = require('axios');
const logger = require('../../../utils/logger');
const { safeStringify } = require('../../../utils/helpers');

async function getGoogleSheetData(googleSheetUrl) {
    if (!googleSheetUrl || googleSheetUrl === '') {
      return '';
    }
    let sheetId;
    if (googleSheetUrl.includes('spreadsheets/d/')) {
      sheetId = googleSheetUrl.split('spreadsheets/d/')[1].split('/')[0];
    } else {
      sheetId = googleSheetUrl;
    }
  
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
  
    try {
      const response = await axios.get(url);
      const rows = response.data.split('\n').map((row) => row.split(','));
      const headers = rows[0];
      return rows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = row[index].trim();
        });
        const googleSheetData = obj ? `Here's the current Q&A data: ${safeStringify(googleSheetData)}. Use this information to provide more accurate answers when possible. If a user's question closely matches a question in this data, prioritize using the corresponding answer, but feel free to expand or adapt it as necessary to fully address the user's query.`
        : '';
        return googleSheetData;
      });
    } catch (error) {
      logger.error('Error fetching Google Sheet:', error);
    throw new Error('Failed to fetch Google Sheet data');
  }
}   

module.exports = {
  getGoogleSheetData,
};