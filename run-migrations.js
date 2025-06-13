// One-time script to run database migrations
require('dotenv').config();
const { initializeDatabase } = require('./config/railway-db-init');
const logger = require('./config/logger');

logger.info('Starting database migrations...');

initializeDatabase()
  .then(() => {
    logger.info('Database migrations completed successfully');
    process.exit(0);
  })
  .catch(err => {
    logger.error('Error running migrations:', err);
    process.exit(1);
  });
