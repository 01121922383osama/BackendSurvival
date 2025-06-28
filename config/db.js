const { Pool } = require('pg');
require('dotenv').config();
const logger = require('./logger');

// Create connection pool - support both Railway's DATABASE_URL and individual params
let poolConfig;

if (process.env.DATABASE_URL) {
  // Railway provides a connection string
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
  logger.info('Using DATABASE_URL for database connection');
} else if (process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER) {
  // Railway also provides individual Postgres environment variables
  poolConfig = {
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
  logger.info('Using Railway PG* environment variables for database connection');
} else {
  // Use individual connection parameters from .env file or defaults
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',  // Default PostgreSQL user
    password: process.env.DB_PASSWORD || '',  // Empty password for local development
  };
  logger.info('Using local environment variables for database connection');
  logger.info(`Database connection details: host=${poolConfig.host}, port=${poolConfig.port}, database=${poolConfig.database}, user=${poolConfig.user}`);
}

const pool = new Pool(poolConfig);

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    logger.error('Error connecting to database:', err);
  } else {
    logger.info('Database connected successfully');
    done();
  }
});

// Test if the database is ready by checking if tables exist
async function testDatabaseReady() {
  try {
    // Try to query the logs table to check if it exists
    const result = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'logs')"
    );
    return result.rows[0].exists;
  } catch (error) {
    logger.error('Error checking database tables:', error);
    return false;
  }
}

// Enhanced query method with retry logic
async function query(text, params, retries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // If this isn't the first attempt, log that we're retrying
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt} for query: ${text.substring(0, 50)}...`);
      }
      
      return await pool.query(text, params);
    } catch (error) {
      lastError = error;
      
      // Log the error with query details
      logger.error(`Database query error (attempt ${attempt + 1}/${retries + 1}):`, {
        error: error.message,
        code: error.code,
        detail: error.detail,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params
      });
      
      // If this is a connection-related error, wait before retrying
      if (
        error.code === 'ECONNREFUSED' ||
        error.code === '08006' ||
        error.code === '57P01' ||
        error.code === '57P02' ||
        error.code === '57P03'
      ) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.info(`Waiting ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (error.code === '42P01') { // Relation does not exist
        logger.error('Table does not exist. Database might need migration.');
        throw error; // Don't retry for schema errors
      } else if (error.code === '28P01' || error.code === '28000') { // Authentication error
        logger.error('Authentication failed. Check database credentials.');
        throw error; // Don't retry for auth errors
      } else if (error.code === '3D000') { // Database does not exist
        logger.error('Database does not exist. Check database name.');
        throw error; // Don't retry for missing database
      } else if (error.code === '42501') { // Permission denied
        logger.error('Permission denied. Check database user permissions.');
        throw error; // Don't retry for permission errors
      } else {
        // For other errors, only retry if we have attempts left
        if (attempt === retries) {
          throw error;
        }
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  query,
  testDatabaseReady,
  pool
};
