const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './temp.env' });
const path = require('path');

// Import Firebase
require('./firebase/firebaseInit');
// MQTT service will be initialized after database setup

// Import routes, middleware and config
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');
const userRoutes = require('./routes/users');
const deviceRoutes = require('./routes/devices');
const firebaseUserRoutes = require('./routes/firebase-users');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./config/logger');
const { swaggerUi, swaggerDocs } = require('./config/swagger');

// WebSocket support
const http = require('http');
const WebSocket = require('ws');

// Initialize express app
const app = express();
const httpServer = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server: httpServer });

// Store connected clients
const connectedClients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  logger.info('New WebSocket client connected');
  connectedClients.add(ws);

  // Send initial data to the client
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to real-time dashboard'
  }));

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// Function to broadcast data to all connected clients
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Make broadcast function available globally
global.broadcastToClients = broadcastToClients;

// Function to broadcast dashboard statistics
async function broadcastDashboardStats() {
  try {
    const deviceModel = require('./models/device');
    const logModel = require('./models/log');
    const admin = require('./firebase/firebaseInit');
    
    // Get Firebase users count directly
    let firebaseUsersCount = 0;
    try {
      const listUsersResult = await admin.auth().listUsers();
      firebaseUsersCount = listUsersResult.users.length;
    } catch (error) {
      logger.error('Error getting Firebase users count:', error);
      firebaseUsersCount = 0;
    }
    
    // Get statistics
    const devices = await deviceModel.getAllDevices();
    const recentLogs = await logModel.getRecentLogs(10);
    
    const stats = {
      type: 'dashboard_stats',
      data: {
        totalUsers: firebaseUsersCount,
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.is_connected).length,
        offlineDevices: devices.filter(d => !d.is_connected).length,
        devicesWithAlerts: devices.filter(d => d.has_alert).length,
        recentLogs: recentLogs.length,
        lastUpdated: new Date().toISOString()
      }
    };
    
    broadcastToClients(stats);
    // logger.debug('Broadcasted dashboard statistics');
  } catch (error) {
    logger.error('Error broadcasting dashboard stats:', error);
  }
}

// Broadcast dashboard stats every 60 seconds (reduced frequency)
setInterval(broadcastDashboardStats, 60000);

// Trust proxy - required for Railway deployment with rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path} - Request received`);
  if (req.method === 'POST') {
    logger.debug(`Request body: ${JSON.stringify(req.body)}`);
    if (Object.keys(req.body).length === 0) {
      logger.warn(`Empty request body received for ${req.method} ${req.path}`);
      logger.warn(`Content-Type: ${req.headers['content-type']}`);
    }
  }
  next();
});

// Routes
app.use('/', authRoutes); // /signup, /login, /profile routes
app.use('/logs', logRoutes);
app.use('/users', userRoutes);
app.use('/devices', deviceRoutes);
app.use('/firebase-users', firebaseUserRoutes);

// API Documentation with Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MQTT status route
app.get('/mqtt/status', (req, res) => {
  const mqttService = require('./firebase/mqttService');
  const status = mqttService.getConnectionStatus();
  res.status(200).json(status);
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Check database connection first
    const dbModule = require('./config/db');

    // Wait for database to be available with exponential backoff
    let dbReady = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!dbReady && attempts < maxAttempts) {
      try {
        logger.info(`Checking database connection (attempt ${attempts + 1}/${maxAttempts})...`);
        await dbModule.pool.query('SELECT 1');
        dbReady = true;
        logger.info('Database connection successful');
      } catch (error) {
        attempts++;
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        logger.warn(`Database connection failed, retrying in ${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!dbReady) {
      logger.error('Failed to connect to database after multiple attempts');
      throw new Error('Database connection failed');
    }

    // Always run migrations in production, or if explicitly enabled
    if ((process.env.DATABASE_URL || process.env.PGDATABASE) &&
      (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true')) {
      try {
        logger.info('Attempting to run database migrations...');
        const { initializeDatabase } = require('./config/railway-db-init');
        await initializeDatabase();
        logger.info('Database migrations completed successfully');
      } catch (error) {
        logger.error('Failed to run migrations:', error);
        throw error; // Re-throw to prevent MQTT initialization if migrations fail
      }
    }

    // Check if required tables exist before initializing MQTT
    const tablesExist = await dbModule.testDatabaseReady();
    if (!tablesExist) {
      logger.error('Required database tables do not exist. Please run migrations.');
      throw new Error('Database schema not ready');
    }

    // Initialize MQTT service only after database is ready
    logger.info('Database ready, initializing MQTT connection...');
    require('./firebase/mqttService');
    logger.info('Server initialization complete');
  } catch (error) {
    logger.error('Server initialization error:', error);
    logger.error('MQTT service will not be initialized due to database issues.');
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