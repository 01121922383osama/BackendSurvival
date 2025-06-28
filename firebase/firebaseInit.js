const admin = require('firebase-admin');
const logger = require('../config/logger');

try {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  };

  if (!serviceAccount.project_id || typeof serviceAccount.project_id !== 'string') {
    throw new Error('Service account object must contain a string "project_id" property.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin SDK initialized successfully.');
} catch (error) {
  logger.error('Firebase Admin SDK initialization failed:', error.message);
  // Exit the process if Firebase initialization fails, as it's a critical dependency
  process.exit(1);
}

module.exports = admin;
