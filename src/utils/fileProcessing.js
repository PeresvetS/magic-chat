// src/utils/fileProcessing.js

const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { DocxLoader } = require("@langchain/community/document_loaders/fs/docx");
const { Document } = require("@langchain/core/documents");
const logger = require('./logger');

async function processPDF(filePath) {
  try {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    return docs;
  } catch (error) {
    logger.error(`Error processing PDF file: ${error.message}`);
    throw error;
  }
}

async function processDocx(filePath) {
  try {
    const loader = new DocxLoader(filePath);
    const docs = await loader.load();
    return docs;
  } catch (error) {
    logger.error(`Error processing DOCX file: ${error.message}`);
    throw error;
  }
}

async function processFile(file) {
  const fileExtension = file.name.split('.').pop().toLowerCase();
  
  switch (fileExtension) {
    case 'pdf':
      return processPDF(file.path);
    case 'docx':
      return processDocx(file.path);
    default:
      throw new Error(`Unsupported file format: ${fileExtension}`);
  }
}

module.exports = {
  processFile
};
