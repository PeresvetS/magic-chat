// index.js

const { main } = require('./src/index');

main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});