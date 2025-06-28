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
    const topicMigrationPath = path.join(__dirname, 'topic-migration.sql');
    const optimizeSqlPath = path.join(__dirname, 'db-optimize.sql');
    
    // Execute init SQL script
    const initSqlScript = fs.readFileSync(initSqlPath, 'utf8');
    await pool.query(initSqlScript);
    logger.info('Database tables created successfully');
    
    // Execute topic migration SQL to ensure topic column exists
    if (fs.existsSync(topicMigrationPath)) {
      const topicMigrationScript = fs.readFileSync(topicMigrationPath, 'utf8');
      await pool.query(topicMigrationScript);
      logger.info('Topic column migration applied successfully');
    }
    
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
    throw error; // Let the caller handle the error
  }
}

// Execute if this script is run directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
