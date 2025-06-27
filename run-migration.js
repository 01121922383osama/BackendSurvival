const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const logger = require('./config/logger');

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_role_to_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    logger.info('Running migration: add_role_to_users.sql');
    await db.query(migrationSQL);
    logger.info('Migration completed successfully');

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
