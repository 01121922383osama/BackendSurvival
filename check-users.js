require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');
const logger = require('./config/logger');

async function checkUsers() {
  try {
    console.log('Checking for existing users in the database...');
    
    // Check if users table exists
    try {
      const tablesResult = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log('Available tables:', tablesResult.rows.map(row => row.table_name).join(', '));
      
      const usersTableExists = tablesResult.rows.some(row => row.table_name === 'users');
      if (!usersTableExists) {
        console.log('Users table does not exist. Creating it...');
        await db.query(`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('Users table created successfully.');
      }
    } catch (error) {
      console.error('Error checking tables:', error);
      return;
    }
    
    // Check for existing users
    const usersResult = await db.query('SELECT id, email, role FROM users');
    
    if (usersResult.rows.length === 0) {
      console.log('No users found in the database.');
      
      // Ask if we should create a test admin user
      console.log('\nWould you like to create a test admin user? (yes/no)');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      console.log('\nTo create this user, run:');
      console.log('node create-admin-user.js');
      
    } else {
      console.log(`Found ${usersResult.rows.length} users in the database:`);
      usersResult.rows.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

checkUsers();
