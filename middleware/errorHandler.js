/**
 * Error handling middleware
 */
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error with appropriate level
  if (err.statusCode >= 500) {
    logger.error(`Error: ${err.message}`, { 
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  } else {
    logger.warn(`Error: ${err.message}`, { 
      path: req.path,
      method: req.method
    });
  }
  
  // Default error status and message
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Send error response
  res.status(status).json({
    error: message,
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
