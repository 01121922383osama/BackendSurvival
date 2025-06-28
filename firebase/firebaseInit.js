const admin = require('firebase-admin');
const logger = require('../config/logger');

try {
  const serviceAccount = require('./firebase-adminsdk.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });

  logger.info('Firebase Admin SDK initialized successfully.');
} catch (error) {
  logger.error('Firebase Admin SDK initialization failed:', error);
  // Exit the process if Firebase initialization fails, as it's a critical dependency
  process.exit(1);
}

module.exports = admin;
