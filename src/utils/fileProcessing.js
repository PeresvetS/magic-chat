// src/utils/fileProcessing.js

const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { DocxLoader } = require('@langchain/community/document_loaders/fs/docx');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

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

async function splitDocument(doc) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  return await splitter.splitDocuments([doc]);
}

async function processFile(file) {
  const fileExtension = file.name.split('.').pop().toLowerCase();

  let docs;
  switch (fileExtension) {
    case 'pdf':
      docs = await processPDF(file.path);
      break;
    case 'docx':
      docs = await processDocx(file.path);
      break;
    default:
      throw new Error(`Unsupported file format: ${fileExtension}`);
  }

  // Разделяем документ на меньшие части
  const splitDocs = await Promise.all(docs.map(splitDocument));
  return splitDocs.flat();
}

module.exports = {
  processFile,
};
