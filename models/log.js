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

const getAllLogs = async (limit = 1000, offset = 0) => {
  try {
    const result = await db.query(
      'SELECT * FROM logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const getLogById = async (id) => {
  try {
    const result = await db.query('SELECT * FROM logs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const updateLog = async (id, deviceId, timestamp, params) => {
  try {
    const result = await db.query(
      'UPDATE logs SET device_id = $1, timestamp = $2, params = $3 WHERE id = $4 RETURNING *',
      [deviceId, timestamp, params, id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const deleteLog = async (id) => {
  try {
    const result = await db.query('DELETE FROM logs WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

const getLogCount = async () => {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM logs');
    return parseInt(result.rows[0].count);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createLog,
  getLogsByDeviceId,
  getAllLogs,
  getLogById,
  updateLog,
  deleteLog,
  getLogCount
};
