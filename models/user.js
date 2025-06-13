const db = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (email, password) => {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert the user into the database
    const result = await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    return result.rows[0];
  } catch (error) {
    // Check for duplicate email error
    if (error.code === '23505') { // PostgreSQL unique constraint violation code
      throw new Error('Email already exists');
    }
    throw error;
  }
};

const findUserByEmail = async (email) => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail
};
