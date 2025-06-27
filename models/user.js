const db = require('../config/db');
const bcrypt = require('bcrypt');

const createUser = async (email, password, role = 'user') => {
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the user into the database with role
    const result = await db.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, role]
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

const getAllUsers = async () => {
  try {
    const result = await db.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    const result = await db.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateUser = async (id, email, password = null, role = null) => {
  try {
    let query, params;

    if (password && role) {
      // Update email, password, and role
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      query = 'UPDATE users SET email = $1, password = $2, role = $3 WHERE id = $4 RETURNING id, email, role';
      params = [email, hashedPassword, role, id];
    } else if (password) {
      // Update email and password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      query = 'UPDATE users SET email = $1, password = $2 WHERE id = $3 RETURNING id, email, role';
      params = [email, hashedPassword, id];
    } else if (role) {
      // Update email and role
      query = 'UPDATE users SET email = $1, role = $2 WHERE id = $3 RETURNING id, email, role';
      params = [email, role, id];
    } else {
      // Only update email
      query = 'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email, role';
      params = [email, id];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    // Check for duplicate email error
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
