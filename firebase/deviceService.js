const admin = require('./firebaseInit');
const logger = require('../config/logger');
const db = admin.firestore();

const createDevice = async (userId, deviceData) => {
  try {
    const deviceRef = db.collection('users').doc(userId).collection('devices').doc(deviceData.id);
    await deviceRef.set({
      ...deviceData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`Device ${deviceData.id} created for user ${userId}`);
    return { id: deviceRef.id, ...deviceData };
  } catch (error) {
    logger.error(`Error creating device for user ${userId}:`, error);
    throw new Error('Could not create device.');
  }
};

const getDevicesByUser = async (userId) => {
  try {
    const devicesRef = db.collection('users').doc(userId).collection('devices');
    const snapshot = await devicesRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error(`Error fetching devices for user ${userId}:`, error);
    throw new Error('Could not fetch devices.');
  }
};

const getAllDevices = async () => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const allDevices = [];
    for (const userDoc of usersSnapshot.docs) {
      const devices = await getDevicesByUser(userDoc.id);
      allDevices.push(...devices.map(d => ({ ...d, userId: userDoc.id })));
    }
    return allDevices;
  } catch (error) {
    logger.error('Error fetching all devices:', error);
    throw new Error('Could not fetch all devices.');
  }
};

const getDeviceById = async (deviceId) => {
  try {
    // This is inefficient, but necessary without knowing the user ID.
    // A better approach would be a root-level 'devices' collection.
    const allDevices = await getAllDevices();
    return allDevices.find(d => d.id === deviceId);
  } catch (error) {
    logger.error(`Error fetching device ${deviceId}:`, error);
    throw new Error('Could not fetch device.');
  }
};

module.exports = {
  createDevice,
  getDevicesByUser,
  getAllDevices,
  getDeviceById,
};
