const db = require('../config/db');

const createLog = async (deviceId, timestamp, params, topic = null, statusColor = null) => {
  try {
    const result = await db.query(
      'INSERT INTO logs (device_id, timestamp, params, topic, status_color) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [deviceId, timestamp, params, topic, statusColor]
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

const getLogsByUserId = async (userId, limit = 1000, offset = 0) => {
  try {
    const result = await db.query(
      `SELECT l.* FROM logs l
       INNER JOIN user_devices ud ON l.device_id = ud.device_id
       WHERE ud.user_id = $1
       ORDER BY l.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
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

const updateLog = async (id, deviceId, timestamp, params, topic = null, statusColor = null) => {
  try {
    const result = await db.query(
      'UPDATE logs SET device_id = $1, timestamp = $2, params = $3, topic = $4, status_color = $5 WHERE id = $6 RETURNING *',
      [deviceId, timestamp, params, topic, statusColor, id]
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

const getLogCountByUserId = async (userId) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM logs l
       INNER JOIN user_devices ud ON l.device_id = ud.device_id
       WHERE ud.user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    throw error;
  }
};

const getLogsByDateRange = async (startDate, endDate, deviceId = null, limit = 1000, offset = 0) => {
  try {
    let query, params;
    
    if (deviceId) {
      query = 'SELECT * FROM logs WHERE device_id = $1 AND timestamp BETWEEN $2 AND $3 ORDER BY timestamp DESC LIMIT $4 OFFSET $5';
      params = [deviceId, startDate, endDate, limit, offset];
    } else {
      query = 'SELECT * FROM logs WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC LIMIT $3 OFFSET $4';
      params = [startDate, endDate, limit, offset];
    }
    
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createLog,
  getLogsByDeviceId,
  getAllLogs,
  getLogsByUserId,
  getLogById,
  updateLog,
  deleteLog,
  getLogCount,
  getLogCountByUserId,
  getLogsByDateRange
};
