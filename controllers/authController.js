const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

const signup = async (req, res) => {
  try {
    // Ensure req.body exists and has properties
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
    }
    
    const { email, password, role } = req.body || {};
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if this is the first user in the system, make them admin
    let userRole = role;
    if (!userRole) {
      const allUsers = await User.getAllUsers();
      userRole = allUsers.length === 0 ? 'admin' : 'user';
    }
    
    // Create user with role
    const user = await User.createUser(email, password, userRole);
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    // Ensure req.body exists and has properties
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
    }
    
    const { email, password } = req.body || {};
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Create and assign token with role information
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login
};
