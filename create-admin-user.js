require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');
const logger = require('./config/logger');

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Check if users table exists
    try {
      const tablesResult = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
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
    
    // Check if admin user already exists
    const adminEmail = 'admin@example.com';
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingUser.rows.length > 0) {
      console.log(`Admin user with email ${adminEmail} already exists.`);
      return;
    }
    
    // Create admin user
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const result = await db.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [adminEmail, hashedPassword, 'admin']
    );
    
    console.log('Admin user created successfully:');
    console.log(`- ID: ${result.rows[0].id}, Email: ${result.rows[0].email}, Role: ${result.rows[0].role}`);
    console.log('\nYou can now log in with:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

createAdminUser();
