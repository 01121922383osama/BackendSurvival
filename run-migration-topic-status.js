const db = require('./config/db');
const logger = require('./config/logger');

async function addTopicStatusColumns() {
  try {
    logger.info('Adding topic and status_color columns to logs table...');
    
    const result = await db.query(`
      ALTER TABLE logs 
      ADD COLUMN IF NOT EXISTS topic TEXT,
      ADD COLUMN IF NOT EXISTS status_color TEXT;
    `);
    
    logger.info('Successfully added topic and status_color columns to logs table');
    
    // Verify the columns exist
    const verifyResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'logs' 
      AND column_name IN ('topic', 'status_color')
      ORDER BY column_name;
    `);
    
    logger.info('Verification - columns in logs table:', verifyResult.rows);
    
  } catch (error) {
    logger.error('Error adding columns to logs table:', error);
    throw error;
  }
}

// Run the migration
addTopicStatusColumns()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  }); 