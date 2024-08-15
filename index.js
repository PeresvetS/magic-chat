const fs = require('fs');
const path = require('path');
const { main } = require('./src/index');
const logger = require('./src/utils/logger');
const { safeStringify } = require('./src/utils/helpers');

const lockFile = path.join(__dirname, 'app.lock');

function acquireLock() {
  try {
    // Проверяем, существует ли файл блокировки
    if (fs.existsSync(lockFile)) {
      const pid = fs.readFileSync(lockFile, 'utf8');
      // Проверяем, запущен ли процесс с этим PID
      try {
        process.kill(parseInt(pid), 0);
        logger.warn(`Another instance is already running with PID ${pid}`);
        return false;
      } catch (e) {
        // Если процесс не существует, удаляем старый файл блокировки
        logger.warn('Stale lock file found. Removing it.');
        fs.unlinkSync(lockFile);
      }
    }

    // Создаем новый файл блокировки
    fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
    return true;
  } catch (err) {
    logger.error('Error acquiring lock:', safeStringify(err));
    return false;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(lockFile)) {
      const pid = fs.readFileSync(lockFile, 'utf8');
      if (pid === process.pid.toString()) {
        fs.unlinkSync(lockFile);
        logger.info('Lock file removed');
      }
    }
  } catch (err) {
    logger.error('Error releasing lock:', safeStringify(err));
  }
}

logger.info('Starting application...');
logger.info('Node environment:', process.env.NODE_ENV);
logger.info('Current working directory:', process.cwd());

if (acquireLock()) {
  main().catch(error => {
    logger.error('Unhandled error in main function:', safeStringify(error));
    // releaseLock();
    // process.exit(1);
  });
} else {
  logger.warn('Exiting due to another instance running');
  process.exit(0);
}

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down...');
  releaseLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down...');
  releaseLock();
  process.exit(0);
});

// Добавляем обработчик необработанных исключений
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', safeStringify(error));
});

// Добавляем обработчик необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', safeStringify(promise));
  logger.error('Reason:', safeStringify(reason)); 
});
