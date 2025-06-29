const admin = require('./firebaseInit');
const logger = require('../config/logger');
const db = admin.firestore();

/**
 * Creates a new device and associates it with a user by adding the user's ID to the owners array
 * @param {string} userId - The ID of the user who will own this device
 * @param {object} deviceData - The device data
 * @returns {object} The created device
 */
const createDevice = async (userId, deviceData) => {
  try {
    // Ensure we have an owners array and add the current user to it
    const owners = deviceData.owners || [];
    if (!owners.includes(userId)) {
      owners.push(userId);
    }

    // Create a new device in the devices collection
    const deviceRef = deviceData.id ? 
      db.collection('devices').doc(deviceData.id) : 
      db.collection('devices').doc();
    
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await deviceRef.set({
      ...deviceData,
      owners,
      registrationDate: deviceData.registrationDate || timestamp,
      lastUpdated: timestamp,
    });
    
    logger.info(`Device ${deviceRef.id} created with owner ${userId}`);
    return { id: deviceRef.id, ...deviceData, owners };
  } catch (error) {
    logger.error(`Error creating device for user ${userId}:`, error);
    throw new Error('Could not create device.');
  }
};

/**
 * Gets all devices where the specified user is in the owners array
 * @param {string} userId - The ID of the user
 * @returns {Array} Array of devices owned by the user
 */
const getDevicesByUser = async (userId) => {
  try {
    // Query devices where the userId is in the owners array
    const devicesRef = db.collection('devices').where('owners', 'array-contains', userId);
    const snapshot = await devicesRef.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to JavaScript Date objects
      lastUpdated: doc.data().lastUpdated ? doc.data().lastUpdated.toDate() : null,
      registrationDate: doc.data().registrationDate ? doc.data().registrationDate.toDate() : null,
    }));
  } catch (error) {
    logger.error(`Error fetching devices for user ${userId}:`, error);
    throw new Error('Could not fetch devices.');
  }
};

/**
 * Gets all devices in the system
 * @returns {Array} Array of all devices
 */
const getAllDevices = async () => {
  try {
    const snapshot = await db.collection('devices').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to JavaScript Date objects
      lastUpdated: doc.data().lastUpdated ? doc.data().lastUpdated.toDate() : null,
      registrationDate: doc.data().registrationDate ? doc.data().registrationDate.toDate() : null,
    }));
  } catch (error) {
    logger.error('Error fetching all devices:', error);
    throw new Error('Could not fetch all devices.');
  }
};

/**
 * Gets a device by its ID
 * @param {string} deviceId - The ID of the device
 * @returns {object|null} The device or null if not found
 */
const getDeviceById = async (deviceId) => {
  try {
    const deviceDoc = await db.collection('devices').doc(deviceId).get();
    
    if (!deviceDoc.exists) {
      return null;
    }
    
    const data = deviceDoc.data();
    return {
      id: deviceDoc.id,
      ...data,
      // Convert Firestore timestamps to JavaScript Date objects
      lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : null,
      registrationDate: data.registrationDate ? data.registrationDate.toDate() : null,
    };
  } catch (error) {
    logger.error(`Error fetching device ${deviceId}:`, error);
    throw new Error('Could not fetch device.');
  }
};

/**
 * Counts devices for each user
 * @returns {Object} Object with userId as key and device count as value
 */
const countDevicesPerUser = async () => {
  try {
    const devices = await getAllDevices();
    const userDeviceCounts = {};
    
    // Count devices for each user based on the owners array
    devices.forEach(device => {
      if (device.owners && Array.isArray(device.owners)) {
        device.owners.forEach(ownerId => {
          userDeviceCounts[ownerId] = (userDeviceCounts[ownerId] || 0) + 1;
        });
      }
    });
    
    return userDeviceCounts;
  } catch (error) {
    logger.error('Error counting devices per user:', error);
    throw new Error('Could not count devices per user.');
  }
};

module.exports = {
  createDevice,
  getDevicesByUser,
  getAllDevices,
  getDeviceById,
  countDevicesPerUser,
};
