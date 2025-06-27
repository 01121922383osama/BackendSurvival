const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  createFirebaseUser,
  signInWithFirebase,
  updateUserProfile
} = require('../controllers/firebaseAuthController');
const { connectMqtt, subscribeToUserDevices } = require('../firebase/mqttService');
const { db } = require('../firebase/firebaseInit');

/**
 * @swagger
 * /firebase/signup:
 *   post:
 *     summary: Create a new user with Firebase authentication
 *     tags: [Firebase]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               deviceToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
router.post('/signup', createFirebaseUser);

/**
 * @swagger
 * /firebase/login:
 *   post:
 *     summary: Login with Firebase authentication
 *     tags: [Firebase]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               deviceToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', signInWithFirebase);

/**
 * @swagger
 * /firebase/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Firebase]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/profile', authenticateToken, updateUserProfile);

/**
 * @swagger
 * /firebase/device-token:
 *   put:
 *     summary: Update device token for push notifications
 *     tags: [Firebase]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceToken
 *             properties:
 *               deviceToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device token updated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/device-token', authenticateToken, async (req, res) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user.id;
    const firebaseUid = req.user.firebaseUid;

    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    if (!firebaseUid) {
      return res.status(400).json({ error: 'User not linked to Firebase' });
    }

    // Update device token in Firestore
    await db.collection('users').doc(firebaseUid).update({
      deviceToken,
      updatedAt: new Date()
    });

    res.status(200).json({ message: 'Device token updated successfully' });
  } catch (error) {
    console.error('Error updating device token:', error);
    res.status(500).json({ error: 'Error updating device token' });
  }
});

/**
 * @swagger
 * /firebase/subscribe-devices:
 *   post:
 *     summary: Subscribe to MQTT topics for user devices
 *     tags: [Firebase]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Subscribed to device topics successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/subscribe-devices', authenticateToken, async (req, res) => {
  try {
    const { deviceIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: 'Device IDs array is required' });
    }

    // Subscribe to device topics
    await subscribeToUserDevices(userId, deviceIds);

    res.status(200).json({
      message: 'Subscribed to device topics successfully',
      deviceIds
    });
  } catch (error) {
    console.error('Error subscribing to device topics:', error);
    res.status(500).json({ error: 'Error subscribing to device topics' });
  }
});

/**
 * @swagger
 * /firebase/devices:
 *   get:
 *     summary: Get user devices
 *     tags: [Firebase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user devices
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const firebaseUid = req.user.firebaseUid;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'User not linked to Firebase' });
    }

    // Get user devices from Firestore
    const devicesSnapshot = await db.collection('users')
      .doc(firebaseUid)
      .collection('devices')
      .get();

    const devices = [];
    devicesSnapshot.forEach(doc => {
      devices.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({ devices });
  } catch (error) {
    console.error('Error getting user devices:', error);
    res.status(500).json({ error: 'Error getting user devices' });
  }
});

/**
 * @swagger
 * /firebase/device-logs/{deviceId}:
 *   get:
 *     summary: Get logs for a specific device
 *     tags: [Firebase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: startAfter
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device logs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/device-logs/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 20, startAfter } = req.query;
    const userId = req.user.id;
    const firebaseUid = req.user.firebaseUid;

    if (!firebaseUid) {
      return res.status(400).json({ error: 'User not linked to Firebase' });
    }

    // Build query
    let query = db.collection('users')
      .doc(firebaseUid)
      .collection('devices')
      .doc(deviceId)
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    // Add pagination if startAfter is provided
    if (startAfter) {
      const startAfterDoc = await db.collection('users')
        .doc(firebaseUid)
        .collection('devices')
        .doc(deviceId)
        .collection('logs')
        .doc(startAfter)
        .get();

      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Execute query
    const logsSnapshot = await query.get();

    const logs = [];
    logsSnapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      logs,
      pagination: {
        hasMore: logs.length === parseInt(limit),
        lastId: logs.length > 0 ? logs[logs.length - 1].id : null
      }
    });
  } catch (error) {
    console.error('Error getting device logs:', error);
    res.status(500).json({ error: 'Error getting device logs' });
  }
});

// Initialize MQTT connection when the server starts
connectMqtt()
  .then(() => console.log('MQTT service initialized'))
  .catch(err => console.error('Failed to initialize MQTT service:', err));

module.exports = router;
