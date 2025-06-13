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
} else {
  // Use individual connection parameters
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
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

module.exports = {
  query: (text, params) => pool.query(text, params),
};
