// src/utils/logger.js

const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../config');

const { combine, timestamp, printf, errors, splat } = winston.format;

// Создаем кастомный формат для логов
const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Конфигурация для ротации файлов с общими логами
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'temp/logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(
    timestamp(),
    myFormat
  )
});

// Конфигурация для ротации файлов с ошибками
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'temp/logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: combine(
    timestamp(),
    myFormat
  )
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    myFormat
  ),
  defaultMeta: { service: 'tg-wa-service' },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport
  ],
});



logger.add(new winston.transports.Console({
  format: combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

function logEnvironmentInfo() {
  logger.info('Environment Information:');
  logger.info(`Node Version: ${process.version}`);
  logger.info(`Platform: ${process.platform}`);
  logger.info(`Architecture: ${process.arch}`);
  logger.info(`Process ID: ${process.pid}`);
  logger.info(`Current Working Directory: ${process.cwd()}`);
  logger.info('Environment Variables:');
  Object.keys(process.env).forEach(key => {
    if (!key.toLowerCase().includes('key') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('password')) {
      logger.info(`  ${key}: ${process.env[key]}`);
    }
  });
}

// Добавляем функцию logEnvironmentInfo к объекту logger
logger.logEnvironmentInfo = logEnvironmentInfo;

// Вызываем функцию logEnvironmentInfo при инициализации модуля
logEnvironmentInfo();

module.exports = logger;