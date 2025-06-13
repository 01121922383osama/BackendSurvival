const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const logger = require('./logger');

async function initializeDatabase() {
  // Railway provides a DATABASE_URL environment variable
  const connectionString = process.env.DATABASE_URL || {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  const pool = new Pool(typeof connectionString === 'string' ? { connectionString } : connectionString);

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
