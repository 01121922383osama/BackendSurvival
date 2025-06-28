const admin = require('./firebaseInit');
const logger = require('../config/logger');
const userService = require('./userService');

const sendNotification = async (userId, deviceId, title, body) => {
  try {
    const user = await userService.getUserById(userId);
    if (!user || !user.deviceToken) {
      logger.warn(`User ${userId} not found or has no device token. Cannot send notification.`);
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      token: user.deviceToken,
      data: {
        deviceId,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    logger.info(`Successfully sent notification to user ${userId}:`, response);
  } catch (error) {
    logger.error(`Error sending notification to user ${userId}:`, error);
  }
};

const handleDeviceAlert = async (deviceId, params) => {
  try {
    // Find the user associated with this device
    // This is a placeholder for the actual logic to find the user
    const userId = 'some-user-id'; // This needs to be implemented

    if (params?.fallStatus === '1') {
      await sendNotification(userId, deviceId, 'Fall Alert!', `A fall has been detected for device ${deviceId}.`);
    } else if (params?.residentStatus === '1') {
      await sendNotification(userId, deviceId, 'Resident Alert', `A resident alert has been triggered for device ${deviceId}.`);
    }
  } catch (error) {
    logger.error(`Error handling device alert for device ${deviceId}:`, error);
  }
};

module.exports = {
  sendNotification,
  handleDeviceAlert,
};