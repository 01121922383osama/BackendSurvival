const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      logger.warn('Invalid token provided:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
};

// Require admin role middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    logger.warn(`User ${req.user.email} attempted to access admin-only endpoint`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Require owner or admin role middleware
const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestedUserId = parseInt(req.params.id);
  const currentUserId = req.user.userId;

  // Admins can access any user's data
  if (req.user.role === 'admin') {
    return next();
  }

  // Users can only access their own data
  if (currentUserId === requestedUserId) {
    return next();
  }

  logger.warn(`User ${req.user.email} attempted to access data for user ${requestedUserId}`);
  return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
};

// Optional authentication middleware (for endpoints that work with or without auth)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

// Check if user has access to specific device
const checkDeviceAccess = async (req, res, next) => {
  try {
    const { serialNumber } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admins have access to all devices
    if (userRole === 'admin') {
      return next();
    }

    // For regular users, check if they have access to this device
    const deviceModel = require('../models/device');
    const userDevices = await deviceModel.getDevicesByUserId(userId);
    const hasAccess = userDevices.some(d => d.serial_number === serialNumber);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this device' });
    }

    next();
  } catch (error) {
    logger.error('Error checking device access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  optionalAuth,
  checkDeviceAccess
};
