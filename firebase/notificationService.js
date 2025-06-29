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
    
    // Check if fallStatus or residentStatus is 1 (accepts string or number)
    const fallStatus = updateData.fallStatus !== undefined ? updateData.fallStatus : device.fallStatus || device.isFall;
    const residentStatus = updateData.residentStatus !== undefined ? updateData.residentStatus : device.residentStatus;
    
    logger.info(`Fall status: ${fallStatus} (type: ${typeof fallStatus})`);
    logger.info(`Resident status: ${residentStatus} (type: ${typeof residentStatus})`);
    logger.info(`Parsed fall status: ${parseInt(fallStatus)}`);
    logger.info(`Parsed resident status: ${parseInt(residentStatus)}`);
    
    if (parseInt(fallStatus) !== 1 && parseInt(residentStatus) !== 1) {
      logger.info('No alert condition met. Exiting notification process.');
      logger.info('=== NOTIFICATION DEBUG END ===');
      return;
    }

    let title = 'Device Alert';
    let body = '';
    if (parseInt(fallStatus) === 1) {
      body = 'Fall detected! Someone may be in danger.';
      logger.info('Fall alert detected!');
    } else if (parseInt(residentStatus) === 1) {
      body = 'Resident status alert! Please check on the resident.';
      logger.info('Resident alert detected!');
    }

    logger.info(`Notification title: ${title}`);
    logger.info(`Notification body: ${body}`);

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
      logger.info(`Processing owner: ${ownerId}`);
      const user = await userService.getUserById(ownerId);
      logger.info(`User found: ${!!user}`);
      if (user) {
        logger.info(`User device token: ${user.deviceToken ? 'Present' : 'Missing'}`);
        if (user.deviceToken) {
          logger.info(`Sending notification to user ${ownerId} for device ${device.serial_number || device.serialNumber}`);
          await sendNotification(ownerId, device.serial_number || device.serialNumber, title, body);
        } else {
          logger.warn(`User ${ownerId} has no device token. Skipping notification.`);
        }
      } else {
        logger.warn(`User ${ownerId} not found. Skipping notification.`);
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