const admin = require('../firebase/firebaseInit');
const logger = require('../config/logger');
const db = admin.firestore();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found in Firestore.' });
    }

    req.user = { id: userDoc.id, ...userDoc.data() };
    next();
  } catch (error) {
    logger.error('Invalid token:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  if (req.user.isAdmin !== true) {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  next();
};

const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  if (req.user.isAdmin === true || req.user.id === req.params.id) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
};

module.exports = {
  authenticateToken,
  isAdmin,
  isOwnerOrAdmin,
};
