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
  filename: 'logs/combined-%DATE%.log',
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
  filename: 'logs/error-%DATE%.log',
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
  defaultMeta: { service: 'telegram-service' },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport
  ],
});

// Если мы не в продакшене, то также выводим логи в консоль
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;