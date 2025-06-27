const Log = require('../models/log');
const logger = require('../config/logger');

const createLog = async (req, res, next) => {
  try {
    const { deviceId, timestamp, params } = req.body;
    
    // Validate input
    if (!deviceId || !timestamp || !params) {
      return res.status(400).json({ 
        error: 'deviceId, timestamp, and params are required' 
      });
    }
    
    // Validate timestamp format (ISO 8601)
    if (!isValidISODate(timestamp)) {
      return res.status(400).json({ 
        error: 'timestamp must be a valid ISO 8601 date string' 
      });
    }
    
    // Create log
    const log = await Log.createLog(deviceId, timestamp, params);
    
    res.status(201).json({ 
      message: 'Log created successfully',
      id: log.id
    });
  } catch (error) {
    logger.error('Create log error:', error);
    next(error);
  }
};

const getLogsByDeviceId = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    
    // Validate input
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    
    // Get logs
    const logs = await Log.getLogsByDeviceId(deviceId);
    
    res.status(200).json(logs);
  } catch (error) {
    logger.error('Get logs error:', error);
    next(error);
  }
};

// Get all logs with pagination
const getAllLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await Log.getAllLogs(limit, offset);
    const count = await Log.getLogCount();
    
    res.status(200).json({
      logs,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + logs.length < count
      }
    });
  } catch (error) {
    logger.error('Get all logs error:', error);
    next(error);
  }
};

// Get log by ID
const getLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const log = await Log.getLogById(id);
    
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }
    
    res.status(200).json(log);
  } catch (error) {
    logger.error(`Error getting log with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update log
const updateLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deviceId, timestamp, params } = req.body;
    
    // Validate input
    if (!deviceId || !timestamp || !params) {
      return res.status(400).json({ 
        error: 'deviceId, timestamp, and params are required' 
      });
    }
    
    // Validate timestamp format (ISO 8601)
    if (!isValidISODate(timestamp)) {
      return res.status(400).json({ 
        error: 'timestamp must be a valid ISO 8601 date string' 
      });
    }
    
    // Check if log exists
    const existingLog = await Log.getLogById(id);
    if (!existingLog) {
      return res.status(404).json({ message: 'Log not found' });
    }
    
    const updatedLog = await Log.updateLog(id, deviceId, timestamp, params);
    
    res.status(200).json({
      message: 'Log updated successfully',
      log: updatedLog
    });
  } catch (error) {
    logger.error(`Error updating log with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete log
const deleteLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if log exists
    const existingLog = await Log.getLogById(id);
    if (!existingLog) {
      return res.status(404).json({ message: 'Log not found' });
    }
    
    const result = await Log.deleteLog(id);
    
    if (result) {
      res.status(200).json({ message: 'Log deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete log' });
    }
  } catch (error) {
    logger.error(`Error deleting log with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Helper function to validate ISO 8601 date string
function isValidISODate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  createLog,
  getLogsByDeviceId,
  getAllLogs,
  getLogById,
  updateLog,
  deleteLog
};
