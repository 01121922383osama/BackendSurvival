const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const logger = require('./logger');

async function initializeDatabase() {
  // Configure pool based on available connection info
  let poolConfig;
  
  if (process.env.DATABASE_URL) {
    // Railway provides a connection string
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    logger.info('Using DATABASE_URL for database connection');
  } else {
    // Use individual connection parameters
    poolConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
    logger.info('Using individual parameters for database connection');
  }

  const pool = new Pool(poolConfig);

  try {
    // Read SQL files
    const initSqlPath = path.join(__dirname, 'init.sql');
    const optimizeSqlPath = path.join(__dirname, 'db-optimize.sql');
    
    const initSqlScript = fs.readFileSync(initSqlPath, 'utf8');
    
    // Execute init SQL script
    await pool.query(initSqlScript);
    logger.info('Database tables created successfully');
    
    // Execute optimization SQL if it exists
    if (fs.existsSync(optimizeSqlPath)) {
      const optimizeSqlScript = fs.readFileSync(optimizeSqlPath, 'utf8');
      await pool.query(optimizeSqlScript);
      logger.info('Database optimizations applied successfully');
    }

    // Close pool
    await pool.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error initializing database:', error);
    await pool.end();
    process.exit(1);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
