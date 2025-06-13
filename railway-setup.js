// Direct script for Railway database setup
// This file is designed to be run directly from the Railway shell
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Simple logging
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function setupDatabase() {
  log('Starting Railway database setup...');
  
  if (!process.env.DATABASE_URL) {
    log('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Configure pool with Railway's DATABASE_URL
  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
  
  log('Connecting to database...');
  const pool = new Pool(poolConfig);
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log('Database connection successful');
    
    // Read SQL files
    const initSqlPath = path.join(__dirname, 'config', 'init.sql');
    log(`Reading SQL file from: ${initSqlPath}`);
    
    if (!fs.existsSync(initSqlPath)) {
      log(`ERROR: SQL file not found at ${initSqlPath}`);
      process.exit(1);
    }
    
    const initSqlScript = fs.readFileSync(initSqlPath, 'utf8');
    log('SQL file read successfully');
    
    // Execute init SQL script
    log('Creating database tables...');
    await pool.query(initSqlScript);
    log('Database tables created successfully');
    
    // Close pool
    await pool.end();
    log('Database setup completed successfully');
  } catch (error) {
    log(`ERROR: ${error.message}`);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
