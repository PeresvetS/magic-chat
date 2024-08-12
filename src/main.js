// src/main.js

const { MTProto } = require('telegram-mtproto');
const { Storage } = require('mtproto-storage-fs');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const logger = require('./utils/logger');

const api = {
  layer: 57,
  initConnection: 0x69796de9,
  api_id: config.API_ID,
  api_hash: config.API_HASH,
  app_version: '1.0.0',
  device_model: 'Unknown',
  system_version: 'Unknown'
};

const server = {
  dev: process.env.NODE_ENV !== 'production'
};


logger.info('Initializing client...');

const client = MTProto({ api, server, storage: new Storage('./session.json') });


logger.info('Initializing main application components...');

const app = express();
app.use(bodyParser.json());

module.exports = {
  client,
  app
};