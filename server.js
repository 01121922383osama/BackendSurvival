const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// Import routes, middleware and config
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');
const { swaggerUi, swaggerDocs } = require('./config/swagger');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', authRoutes); // /signup and /login routes
app.use('/logs', logRoutes);

// API Documentation with Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Database initialization for Railway if needed
// We'll attempt this after the server starts, not during build

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run database migrations after server has started (for Railway)
  if (process.env.DATABASE_URL && process.env.RUN_MIGRATIONS === 'true') {
    // Wait a bit to ensure database is ready
    setTimeout(() => {
      try {
        logger.info('Attempting to run database migrations...');
        const { initializeDatabase } = require('./config/railway-db-init');
        initializeDatabase()
          .then(() => logger.info('Database migrations completed successfully'))
          .catch(err => logger.error('Error running migrations:', err));
      } catch (error) {
        logger.error('Failed to run migrations:', error);
      }
    }, 5000); // Wait 5 seconds before attempting migrations
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app; // For testing purposes
