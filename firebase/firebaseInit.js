const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

module.exports = {
  admin,
  db,
  messaging
};
