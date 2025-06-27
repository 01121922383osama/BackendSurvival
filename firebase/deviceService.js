const { db, messaging } = require('./firebaseInit');

/**
 * Save device log data to Firestore
 * @param {string} userId - User ID who owns the device
 * @param {string} deviceId - Device identifier
 * @param {object} logData - Log data to store
 * @returns {Promise<object>} - Created log document
 */
async function saveDeviceLog(userId, deviceId, logData) {
  try {
    // Create a reference to the logs collection for this device
    const logsRef = db.collection('users').doc(userId)
      .collection('devices').doc(deviceId)
      .collection('logs');
    
    // Add timestamps
    const now = new Date();
    const logWithTimestamp = {
      ...logData,
      timestamp: logData.timestamp || now,
      createdAt: now
    };
    
    // Add the log document
    const logRef = await logsRef.add(logWithTimestamp);
    
    // Update the device's latest status
    await updateDeviceStatus(userId, deviceId, logWithTimestamp);
    
    // Check if notification should be sent
    await checkAndSendNotification(userId, deviceId, logWithTimestamp);
    
    return {
      id: logRef.id,
      ...logWithTimestamp
    };
  } catch (error) {
    console.error('Error saving device log:', error);
    throw error;
  }
}

/**
 * Update device status with latest log data
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID
 * @param {object} logData - Latest log data
 * @returns {Promise<void>}
 */
async function updateDeviceStatus(userId, deviceId, logData) {
  try {
    const deviceRef = db.collection('users').doc(userId)
      .collection('devices').doc(deviceId);
    
    // Get current device data
    const deviceDoc = await deviceRef.get();
    
    // Prepare update data
    const updateData = {
      lastUpdated: new Date(),
      lastStatus: logData,
      statusColor: getDeviceStatusColor(logData.params)
    };
    
    // If device doesn't exist yet, add more info
    if (!deviceDoc.exists) {
      updateData.createdAt = new Date();
      updateData.deviceId = deviceId;
    }
    
    // Update the device document
    await deviceRef.set(updateData, { merge: true });
    
  } catch (error) {
    console.error('Error updating device status:', error);
    throw error;
  }
}

/**
 * Determine device status color based on parameters
 * @param {object} params - Device parameters
 * @returns {string} - Color code
 */
function getDeviceStatusColor(params) {
  if (params.fallStatus?.toString() === '1') return 'red';
  if (params.residentStatus?.toString() === '1') return 'yellow';
  
  const isActive = (key) => params[key]?.toString() != null && 
                           params[key] !== '0' && 
                           params[key] !== '?';
  
  if (isActive('motionStatus') || isActive('movementSigns') || isActive('someoneExists')) return 'green';
  if (isActive('online') || isActive('heartBeat')) return 'blue';
  
  return 'grey';
}

/**
 * Check if notification should be sent based on device status
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID
 * @param {object} logData - Log data
 * @returns {Promise<void>}
 */
async function checkAndSendNotification(userId, deviceId, logData) {
  try {
    const params = logData.params || {};
    
    // Get user's device token
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || !userDoc.data().deviceToken) {
      console.log(`No device token found for user ${userId}`);
      return;
    }
    
    const deviceToken = userDoc.data().deviceToken;
    
    // Check for critical conditions
    if (params.fallStatus?.toString() === '1') {
      await sendNotification(
        deviceToken,
        'Critical Alert',
        'Fall detected! Immediate attention required.',
        { 
          deviceId,
          type: 'fall_alert',
          color: 'red',
          timestamp: logData.timestamp
        }
      );
    } 
    // Check for cautionary conditions
    else if (params.residentStatus?.toString() === '1') {
      await sendNotification(
        deviceToken,
        'Cautionary Alert',
        'Unusual resident status detected. Please check.',
        { 
          deviceId,
          type: 'resident_alert',
          color: 'yellow',
          timestamp: logData.timestamp
        }
      );
    }
  } catch (error) {
    console.error('Error checking and sending notification:', error);
    // Don't throw error to prevent log saving from failing
  }
}

/**
 * Send push notification via FCM
 * @param {string} token - Device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 * @returns {Promise<void>}
 */
async function sendNotification(token, title, body, data = {}) {
  try {
    const message = {
      notification: {
        title,
        body
      },
      data: Object.entries(data).reduce((acc, [key, value]) => {
        // FCM data must be strings
        acc[key] = value?.toString() || '';
        return acc;
      }, {}),
      token
    };
    
    const response = await messaging.send(message);
    console.log('Successfully sent notification:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Get device logs with pagination
 * @param {string} userId - User ID
 * @param {string} deviceId - Device ID
 * @param {number} limit - Number of logs to fetch
 * @param {object} startAfter - Last document for pagination
 * @returns {Promise<Array>} - Array of logs
 */
async function getDeviceLogs(userId, deviceId, limit = 20, startAfter = null) {
  try {
    let query = db.collection('users').doc(userId)
      .collection('devices').doc(deviceId)
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting device logs:', error);
    throw error;
  }
}

module.exports = {
  saveDeviceLog,
  updateDeviceStatus,
  getDeviceLogs,
  getDeviceStatusColor,
  sendNotification
};
