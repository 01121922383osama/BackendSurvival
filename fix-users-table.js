require('dotenv').config();
const db = require('./config/db');
const logger = require('./config/logger');

async function fixUsersTable() {
  try {
    console.log('Checking users table structure...');

    // Check if the role column exists
    const columnCheck = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('Role column does not exist. Adding it to the users table...');

      // Add role column with default value 'user'
      await db.query(`
        ALTER TABLE users
        ADD COLUMN role VARCHAR(50) DEFAULT 'user'
      `);

      console.log('Role column added successfully.');

      // Update existing users to have the 'admin' role
      await db.query(`
        UPDATE users
        SET role = 'admin'
      `);

      console.log('Existing users updated with admin role.');
    } else {
      console.log('Role column already exists in the users table.');
    }

    // Check users table structure
    const tableStructure = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);

    console.log('\nCurrent users table structure:');
    tableStructure.rows.forEach(column => {
      console.log(`- ${column.column_name}: ${column.data_type}`);
    });

    // List users
    const users = await db.query('SELECT id, email, role FROM users');

    console.log('\nUsers in the database:');
    if (users.rows.length === 0) {
      console.log('No users found.');
    } else {
      users.rows.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('Error fixing users table:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

fixUsersTable();
