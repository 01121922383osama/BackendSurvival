const mqtt = require('mqtt');
const { saveDeviceLog } = require('./deviceService');

let client = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;
let reconnectTimer = null;
let isDisposed = false;

// Default MQTT configuration matching Flutter app
const defaultConfig = {
  host: '167.71.52.138',
  port: 1883,
  username: '123456',
  password: '123456',
  topic: '/Radar60FL/#'
};

// In-memory map of allowed device IDs for filtering
// In production, consider using Redis or another distributed cache
const allowedDeviceIds = new Set();

/**
 * Set allowed device IDs for filtering
 * @param {Array<string>} deviceIds - Array of device IDs to allow
 */
function setAllowedDeviceIds(deviceIds) {
  allowedDeviceIds.clear();
  deviceIds.forEach(id => allowedDeviceIds.add(id));
  console.log(`Set ${deviceIds.length} allowed device IDs for filtering`);
}

/**
 * Connect to MQTT broker
 * @param {object} config - MQTT configuration
 * @returns {Promise<void>}
 */
function connectMqtt(config = {}) {
  return new Promise((resolve, reject) => {
    // Reset disposed flag when connecting
    isDisposed = false;
    
    const {
      host = defaultConfig.host,
      port = defaultConfig.port,
      username = defaultConfig.username,
      password = defaultConfig.password,
      topic = defaultConfig.topic,
      clientId = `server_${Math.random().toString(16).slice(2, 8)}`
    } = config;
    
    const connectUrl = `mqtt://${host}`;
    
    const options = {
      clientId,
      port,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000
    };
    
    // Add credentials if provided
    if (username && password) {
      options.username = username;
      options.password = password;
    }
    
    console.log(`Connecting to MQTT broker at ${connectUrl}:${port}...`);
    
    try {
      client = mqtt.connect(connectUrl, options);
      
      client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        reconnectAttempts = 0;
        
        // Subscribe to the topic
        console.log(`Subscribing to topic: ${topic}`);
        client.subscribe(topic, { qos: 1 });
        
        resolve(client);
      });
      
      client.on('error', (err) => {
        console.error('❌ MQTT connection error:', err);
        reject(err);
      });
      
      client.on('message', handleMqttMessage);
      
      client.on('disconnect', () => {
        console.log('MQTT: Disconnected');
        
        // Only attempt to reconnect if not disposed
        if (!isDisposed && reconnectAttempts < maxReconnectAttempts) {
          handleReconnect();
        }
      });
      
    } catch (error) {
      console.error('❌ MQTT connection failed:', error);
      reject(error);
    }
  });
}

/**
 * Subscribe to MQTT topics for a user
 * @param {string} userId - User ID
 * @param {Array<string>} deviceIds - Array of device IDs
 * @returns {Promise<void>}
 */
function subscribeToUserDevices(userId, deviceIds) {
  if (!client || !client.connected) {
    throw new Error('MQTT client not connected');
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Set allowed device IDs for filtering
      setAllowedDeviceIds(deviceIds);
      
      // Store user-device mapping for message handling
      deviceIds.forEach(deviceId => {
        const topic = `/Radar60FL/${deviceId}/#`;
        
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            console.error(`Error subscribing to ${topic}:`, err);
            reject(err);
          } else {
            console.log(`Subscribed to ${topic} for user ${userId}`);
            
            // Store mapping in memory
            deviceTopicMap[deviceId] = userId;
          }
        });
      });
      
      resolve();
    } catch (error) {
      console.error('Error subscribing to topics:', error);
      reject(error);
    }
  });
}

// In-memory map of device IDs to user IDs
// In production, consider using Redis or another distributed cache
const deviceTopicMap = {};

/**
 * Handle incoming MQTT messages
 * @param {string} topic - MQTT topic
 * @param {Buffer} message - Message payload
 */
async function handleMqttMessage(topic, message) {
  try {
    console.log(`Received message on topic ${topic}`);
    
    // Extract device ID from topic (format: /Radar60FL/{deviceId}/...)
    const topicParts = topic.split('/');
    if (topicParts.length < 3) {
      console.log(`Invalid topic format: ${topic}`);
      return;
    }
    
    const deviceId = topicParts[2];
    
    // Check if this device is allowed
    if (allowedDeviceIds.size > 0 && !allowedDeviceIds.has(deviceId)) {
      console.log(`Device ${deviceId} not in allowed list, skipping.`);
      return;
    }
    
    // Get user ID from device mapping
    const userId = deviceTopicMap[deviceId];
    if (!userId) {
      console.log(`No user mapping found for device ${deviceId}`);
      return;
    }
    
    // Parse message payload
    let payload;
    try {
      payload = JSON.parse(message.toString());
    } catch (e) {
      console.error('Error parsing MQTT message:', e);
      payload = { rawData: message.toString() };
      return; // Skip invalid messages
    }
    
    // Check if this is a valid message with params
    if (!payload.params) {
      console.log('Message has no params, skipping');
      return;
    }
    
    // Filter for relevant parameters
    const rawParams = payload.params;
    const filteredParams = {};
    
    // Only include relevant parameters
    ['fallStatus', 'residentStatus', 'motionStatus', 'movementSigns', 
     'someoneExists', 'online', 'heartBeat'].forEach(key => {
      if (rawParams[key] !== undefined) {
        filteredParams[key] = rawParams[key];
      }
    });
    
    // Skip if no relevant parameters
    if (Object.keys(filteredParams).length === 0) {
      console.log('No relevant parameters found, skipping');
      return;
    }
    
    // Save to Firestore
    await saveDeviceLog(userId, deviceId, {
      params: filteredParams,
      timestamp: new Date()
    });
    
    console.log(`Processed message for device ${deviceId}, user ${userId}`);
  } catch (error) {
    console.error('Error handling MQTT message:', error);
  }
}

/**
 * Disconnect MQTT client
 */
function disconnect() {
  try {
    // Set disposed flag first to prevent new operations
    isDisposed = true;
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    console.log('MQTT: Disconnecting client...');
    
    if (client) {
      // Unsubscribe from all topics first
      try {
        client.unsubscribe(defaultConfig.topic);
        // Wait a moment for unsubscribe to complete
        setTimeout(() => {
          if (client.connected) {
            client.end(true);
            console.log('MQTT: Disconnected successfully.');
          } else {
            console.log('MQTT: Client already disconnected');
          }
        }, 300);
      } catch (e) {
        console.error('MQTT: Error during disconnect:', e);
        // Force disconnect if unsubscribe fails
        if (client.connected) {
          client.end(true);
        }
      }
    }
  } catch (e) {
    console.error('❌ MQTT: Error during disconnect process:', e);
  } finally {
    // Always ensure isDisposed is true at the end
    isDisposed = true;
  }
}

/**
 * Handle reconnection logic
 */
function handleReconnect() {
  if (isDisposed) return;
  
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log('❌ MQTT: Max reconnection attempts reached. Stopping.');
    return;
  }
  
  reconnectAttempts++;
  const delay = Math.pow(2, reconnectAttempts) * 1000; // Exponential backoff
  console.log(`MQTT: Attempting reconnect ${reconnectAttempts}/${maxReconnectAttempts} in ${delay/1000} seconds...`);
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  reconnectTimer = setTimeout(async () => {
    if (isDisposed) return;
    
    if (!client || !client.connected) {
      console.log('MQTT: Retrying connection...');
      try {
        await connectMqtt();
      } catch (e) {
        if (!isDisposed) {
          console.error('MQTT: Reconnection attempt failed:', e);
        }
      }
    }
  }, delay);
}

/**
 * Publish message to MQTT topic
 * @param {string} deviceId - Device ID
 * @param {object} params - Parameters to send
 * @returns {Promise<void>}
 */
async function publishMessage(deviceId, params) {
  if (!client || !client.connected) {
    throw new Error('MQTT client not connected');
  }
  
  const topic = `/Radar60FL/${deviceId}/sys/property/set`;
  const message = {
    version: '1.0',
    method: 'set',
    params
  };
  
  const payload = JSON.stringify(message);
  
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`Error publishing to ${topic}:`, err);
        reject(err);
      } else {
        console.log(`Published to ${topic}: ${payload}`);
        resolve();
      }
    });
  });
}

module.exports = {
  connectMqtt,
  subscribeToUserDevices,
  disconnect,
  publishMessage,
  setAllowedDeviceIds
};
