// src/services/crm/index.js

const bitrixService = require('./src/bitrixService');
const amoCrmService = require('./src/amoCrmService');
const processExcelFile = require('./src/xlsProcessor');

module.exports = {
    bitrixService,
    amoCrmService,
    processExcelFile
}