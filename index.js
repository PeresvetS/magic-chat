// index.js

const { main } = require('./src/index');
const logger = require('./src/utils/logger');

logger.info('Starting application...');
logger.info('Node environment:', process.env.NODE_ENV);
logger.info('Current working directory:', process.cwd());

main().catch(error => {
  logger.error('Unhandled error in main function:', error);
  process.exit(1);
});
