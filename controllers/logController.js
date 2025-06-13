const Log = require('../models/log');

const createLog = async (req, res) => {
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
    console.error('Create log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLogsByDeviceId = async (req, res) => {
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
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
  getLogsByDeviceId
};
