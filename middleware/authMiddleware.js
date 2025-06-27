const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  next();
};

// Middleware to check if user is accessing their own data or is admin
const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  // Allow if user is admin
  if (req.user.role === 'admin') {
    return next();
  }

  // Allow if user is accessing their own data
  if (req.params.id && req.user.id === parseInt(req.params.id)) {
    return next();
  }

  // Otherwise deny access
  return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
};

module.exports = {
  authenticateToken,
  isAdmin,
  isOwnerOrAdmin
};
