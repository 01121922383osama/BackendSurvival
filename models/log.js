const db = require('../config/db');

const createLog = async (deviceId, timestamp, params) => {
  try {
    const result = await db.query(
      'INSERT INTO logs (device_id, timestamp, params) VALUES ($1, $2, $3) RETURNING id',
      [deviceId, timestamp, params]
    );
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getLogsByDeviceId = async (deviceId, limit = 1000) => {
  try {
    const result = await db.query(
      'SELECT * FROM logs WHERE device_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [deviceId, limit]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createLog,
  getLogsByDeviceId
};
