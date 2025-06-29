const mqtt = require('mqtt');
const logger = require('../config/logger');
const admin = require('./firebaseInit');
const { handleDeviceAlert } = require('./notificationService');
const logModel = require('../models/log');
const deviceModel = require('../models/device');

const broker = process.env.MQTT_BROKER || 'mqtt://167.71.52.138';
const options = {
  port: process.env.MQTT_PORT || 1883,
  clientId: `backend_server_${Date.now()}`,
  username: process.env.MQTT_USERNAME || '123456',
  password: process.env.MQTT_PASSWORD || '123456',
  keepalive: 30,
  reconnectPeriod: 5000,
  connectTimeout: 30000,
  clean: true
};

let client = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Initialize MQTT connection
const initializeMQTT = () => {
  if (client) {
    logger.info('MQTT client already exists, disconnecting first...');
    client.end();
  }

  logger.info('Initializing MQTT connection...');
  client = mqtt.connect(broker, options);

client.on('connect', () => {
    logger.info('✅ Connected to MQTT broker');
    isConnected = true;
    reconnectAttempts = 0;
    
    // Subscribe to all device topics
  client.subscribe('/Radar60FL/#', (err) => {
    if (err) {
      logger.error('MQTT subscription error:', err);
    } else {
      logger.info('Subscribed to /Radar60FL/#');
    }
  });
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    // logger.debug(`MQTT message received on topic ${topic}:`, payload);

    const topicParts = topic.split('/');
    if (topicParts.length < 3) {
      logger.warn(`Invalid topic format: ${topic}`);
      return;
    }
    const deviceId = topicParts[2];

      // Process device status and update device record
      await processDeviceMessage(deviceId, topic, payload);

      // Save log to database
      await saveLogToDatabase(deviceId, topic, payload);

    // Check for alert conditions and send notifications
    if (payload.params?.fallStatus === '1' || payload.params?.residentStatus === '1') {
      await handleDeviceAlert(deviceId, payload.params);
    }

  } catch (error) {
    logger.error('Error processing MQTT message:', error);
  }
});

client.on('error', (error) => {
  logger.error('MQTT client error:', error);
    isConnected = false;
});

client.on('close', () => {
  logger.warn('MQTT client disconnected');
    isConnected = false;
    handleReconnect();
  });

  client.on('reconnect', () => {
    logger.info('MQTT client reconnecting...');
  });

  client.on('offline', () => {
    logger.warn('MQTT client went offline');
    isConnected = false;
  });
};

// Process device message and update device status
const processDeviceMessage = async (deviceId, topic, payload) => {
  try {
    const params = payload.params || {};
    
    // Check if device exists in database
    let device = await deviceModel.getDeviceBySerialNumber(deviceId);
    
    if (!device) {
      // Create new device if it doesn't exist
      logger.info(`Creating new device: ${deviceId}`);
      device = await deviceModel.createDevice({
        serialNumber: deviceId,
        name: `Device ${deviceId}`,
        location: 'Unknown',
        isConnected: true,
        hasAlert: false,
        lastUpdated: new Date(),
        notificationsEnabled: true,
        isFall: false,
        owners: []
      });
    }

    // Update device status based on MQTT message
    const updateData = {
      isConnected: true,
      lastUpdated: new Date(),
      hasAlert: params.fallStatus === '1' || params.residentStatus === '1',
      alertMessage: params.fallStatus === '1' ? 'Fall detected' : 
                   params.residentStatus === '1' ? 'Resident alert' : null,
      isFall: params.fallStatus === '1'
    };

    await deviceModel.updateDevice(deviceId, updateData);
    
    // logger.debug(`Updated device ${deviceId} status:`, updateData);

    // Broadcast real-time update to connected WebSocket clients
    if (global.broadcastToClients) {
      const realTimeUpdate = {
        type: 'device_update',
        deviceId: deviceId,
        data: {
          ...updateData,
          serialNumber: deviceId,
          name: device.name || `Device ${deviceId}`,
          location: device.location || 'Unknown'
        },
        timestamp: new Date().toISOString()
      };
      
      global.broadcastToClients(realTimeUpdate);
      // logger.debug(`Broadcasted device update for ${deviceId}`);
    }
  } catch (error) {
    logger.error(`Error processing device message for ${deviceId}:`, error);
  }
};

// Save log to database
const saveLogToDatabase = async (deviceId, topic, payload) => {
  try {
    const params = payload.params || {};
    const statusColor = getColorForParams(params);
    
    await logModel.createLog(
      deviceId,
      new Date(),
      params,
      topic,
      statusColor
    );
    
    // logger.debug(`Saved log to database for device ${deviceId}`);
  } catch (error) {
    logger.error(`Error saving log to database for device ${deviceId}:`, error);
  }
};

// Handle reconnection
const handleReconnect = () => {
  if (reconnectAttempts >= maxReconnectAttempts) {
    logger.error(`Max reconnection attempts (${maxReconnectAttempts}) reached. Stopping reconnection.`);
    return;
  }

  reconnectAttempts++;
  const delay = Math.pow(2, reconnectAttempts) * 1000; // Exponential backoff
  
  logger.info(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  setTimeout(() => {
    if (!isConnected) {
      logger.info('Attempting to reconnect to MQTT broker...');
      initializeMQTT();
    }
  }, delay);
};

// Publish message to MQTT
const publishMessage = async (topic, message) => {
  if (!isConnected || !client) {
    logger.error('Cannot publish message - MQTT not connected');
    return false;
  }

  try {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`Error publishing to ${topic}:`, err);
      } else {
        logger.debug(`Published message to ${topic}:`, payload);
      }
    });
    return true;
  } catch (error) {
    logger.error(`Error publishing message to ${topic}:`, error);
    return false;
  }
};

// Get connection status
const getConnectionStatus = () => {
  return {
    isConnected,
    reconnectAttempts,
    maxReconnectAttempts
  };
};

// Disconnect MQTT client
const disconnect = () => {
  if (client) {
    logger.info('Disconnecting MQTT client...');
    client.end();
    client = null;
    isConnected = false;
  }
};

function getColorForParams(p) {
  if (!p) return 'grey';

  const isNoMotionNoMoveNoSomeOneNoSomeExistField = (key) => {
    const v = p[key]?.toString();
    if (v == null || v === '?') return true;
    const n = parseInt(v, 10);
    return !isNaN(n) && n === 0;
  };

  const isGreenField = (key) => {
    const v = p[key]?.toString();
    if (v == null || v === '?') return false;
    const n = parseInt(v, 10);
    return !isNaN(n) && n !== 0;
  };

  if (p['fallStatus']?.toString() === '1') return 'red';
  if (p['residentStatus']?.toString() === '1') return 'yellow';
  if (isGreenField('motionStatus') || isGreenField('movementSigns') || isGreenField('someoneExists')) return 'green';
  if (isGreenField('online') || isGreenField('heartBeat')) return 'blue';
  if (isNoMotionNoMoveNoSomeOneNoSomeExistField('motionStatus') || isNoMotionNoMoveNoSomeOneNoSomeExistField('movementSigns') || isNoMotionNoMoveNoSomeOneNoSomeExistField('someoneExists')) return 'blue';
  if (p['residentStatus']?.toString() === '0') return 'green';

  return 'grey';
}

// Initialize MQTT connection when module is loaded
initializeMQTT();

module.exports = {
  client,
  publishMessage,
  getConnectionStatus,
  disconnect,
  isConnected: () => isConnected
};
