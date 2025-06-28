const db = require('../config/db');

const createDevice = async (deviceData) => {
  try {
    const {
      serialNumber,
      name,
      location,
      isConnected = false,
      hasAlert = false,
      alertMessage,
      lastUpdated,
      registrationDate,
      notificationsEnabled = true,
      isFall = false,
      owners = []
    } = deviceData;

    const result = await db.query(
      `INSERT INTO devices (
        serial_number, name, location, is_connected, has_alert, 
        alert_message, last_updated, registration_date, 
        notifications_enabled, is_fall, owners
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`,
      [
        serialNumber, name, location, isConnected, hasAlert,
        alertMessage, lastUpdated, registrationDate,
        notificationsEnabled, isFall, JSON.stringify(owners)
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      throw new Error('Device with this serial number already exists');
    }
    throw error;
  }
};

const getDeviceBySerialNumber = async (serialNumber) => {
  try {
    const result = await db.query(
      'SELECT * FROM devices WHERE serial_number = $1',
      [serialNumber]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getAllDevices = async () => {
  try {
    const result = await db.query(
      'SELECT * FROM devices ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getDevicesByUserId = async (userId) => {
  try {
    const result = await db.query(
      `SELECT d.* FROM devices d
       INNER JOIN user_devices ud ON d.id = ud.device_id
       WHERE ud.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const updateDevice = async (serialNumber, updateData) => {
  try {
    const {
      name,
      location,
      isConnected,
      hasAlert,
      alertMessage,
      lastUpdated,
      notificationsEnabled,
      isFall,
      owners
    } = updateData;

    const result = await db.query(
      `UPDATE devices SET 
        name = COALESCE($1, name),
        location = COALESCE($2, location),
        is_connected = COALESCE($3, is_connected),
        has_alert = COALESCE($4, has_alert),
        alert_message = COALESCE($5, alert_message),
        last_updated = COALESCE($6, last_updated),
        notifications_enabled = COALESCE($7, notifications_enabled),
        is_fall = COALESCE($8, is_fall),
        owners = COALESCE($9, owners),
        updated_at = NOW()
       WHERE serial_number = $10
       RETURNING *`,
      [
        name, location, isConnected, hasAlert, alertMessage,
        lastUpdated, notificationsEnabled, isFall,
        owners ? JSON.stringify(owners) : null, serialNumber
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteDevice = async (serialNumber) => {
  try {
    const result = await db.query(
      'DELETE FROM devices WHERE serial_number = $1 RETURNING id',
      [serialNumber]
    );

    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
};

const assignDeviceToUser = async (userId, deviceId) => {
  try {
    const result = await db.query(
      'INSERT INTO user_devices (user_id, device_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [userId, deviceId]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const removeDeviceFromUser = async (userId, deviceId) => {
  try {
    const result = await db.query(
      'DELETE FROM user_devices WHERE user_id = $1 AND device_id = $2 RETURNING *',
      [userId, deviceId]
    );
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
};

const getDeviceUsers = async (deviceId) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.role FROM users u
       INNER JOIN user_devices ud ON u.id = ud.user_id
       WHERE ud.device_id = $1`,
      [deviceId]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createDevice,
  getDeviceBySerialNumber,
  getAllDevices,
  getDevicesByUserId,
  updateDevice,
  deleteDevice,
  assignDeviceToUser,
  removeDeviceFromUser,
  getDeviceUsers
}; 