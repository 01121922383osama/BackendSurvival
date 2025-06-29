const rateLimit = require('express-rate-limit');

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// General API rate limiter with higher limits for development
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Higher limit in development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.'
  }
});

// More permissive rate limiter for auth endpoints in development
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 100 : 10, // Higher limit in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again later.'
  }
});

// Special rate limiter for log creation with higher limits for development
const logCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 100, // Higher limit in development
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many log creation requests, please try again later.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  logCreationLimiter
};
