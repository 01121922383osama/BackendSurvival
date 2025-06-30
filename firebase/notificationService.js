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

const notifyOwnersOnDeviceAlert = async (device, updateData) => {
  try {
    logger.info('=== NOTIFICATION DEBUG START ===');
    logger.info('Device object:', JSON.stringify(device, null, 2));
    logger.info('Update data:', JSON.stringify(updateData, null, 2));

    // Only check fallStatus
    const fallStatus = updateData.fallStatus !== undefined ? updateData.fallStatus : device.fallStatus || device.isFall;
    logger.info(`Fall status: ${fallStatus} (type: ${typeof fallStatus})`);
    logger.info(`Parsed fall status: ${parseInt(fallStatus)}`);

    if (parseInt(fallStatus) !== 1) {
      logger.info('No fall alert condition met. Exiting notification process.');
      logger.info('=== NOTIFICATION DEBUG END ===');
      return;
    }

    logger.info('Fall alert detected!');
    const notifications = [{
      title: 'Device Alert',
      body: 'Fall detected! Someone may be in danger.',
      type: 'fall'
    }];

    // Owners may be a JSON string or array
    let owners = device.owners;
    logger.info(`Original owners: ${owners} (type: ${typeof owners})`);

    if (typeof owners === 'string') {
      try {
        owners = JSON.parse(owners);
        logger.info('Parsed owners from string:', owners);
      } catch (e) {
        logger.warn('Failed to parse owners string:', e.message);
        owners = [];
      }
    }
    if (!Array.isArray(owners)) {
      logger.warn('Owners is not an array, setting to empty array');
      owners = [];
    }

    logger.info(`Final owners array: ${JSON.stringify(owners)}`);
    logger.info(`Number of owners: ${owners.length}`);

    if (owners.length === 0) {
      logger.warn('No owners found for device. Cannot send notifications.');
      logger.info('=== NOTIFICATION DEBUG END ===');
      return;
    }

    for (const ownerId of owners) {
      for (const notif of notifications) {
        logger.info(`Sending ${notif.type} notification to user ${ownerId} for device ${device.serial_number || device.serialNumber}`);
        await sendNotification(ownerId, device.serial_number || device.serialNumber, notif.title, notif.body);
      }
    }

    logger.info('=== NOTIFICATION DEBUG END ===');
  } catch (error) {
    logger.error(`Error notifying owners for device ${device.serial_number || device.serialNumber}:`, error);
    logger.info('=== NOTIFICATION DEBUG END (ERROR) ===');
  }
};

module.exports = {
  sendNotification,
  notifyOwnersOnDeviceAlert,
};