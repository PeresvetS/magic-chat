const fs = require('fs');
const path = require('path');
const { main } = require('./src/index');
const logger = require('./src/utils/logger');

const lockFile = path.join(__dirname, 'app.lock');

function acquireLock() {
  try {
    fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') {
      logger.warn('Another instance is already running');
      return false;
    }
    throw err;
  }
}

function releaseLock() {
  try {
    fs.unlinkSync(lockFile);
  } catch (err) {
    logger.error('Error releasing lock:', err);
  }
}

logger.info('Starting application...');
logger.info('Node environment:', process.env.NODE_ENV);
logger.info('Current working directory:', process.cwd());

if (acquireLock()) {
  main().catch(error => {
    logger.error('Unhandled error in main function:', error);
    releaseLock();
    process.exit(1);
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