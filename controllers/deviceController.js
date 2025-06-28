const deviceModel = require('../models/device');
const userModel = require('../models/user');
const logger = require('../config/logger');

// Create a new device
const createDevice = async (req, res) => {
  try {
    const deviceData = req.body;
    const device = await deviceModel.createDevice(deviceData);
    
    res.status(201).json({
      message: 'Device created successfully',
      device
    });
  } catch (error) {
    logger.error('Error creating device:', error);
    if (error.message === 'Device with this serial number already exists') {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all devices (admin only)
const getAllDevices = async (req, res) => {
  try {
    const devices = await deviceModel.getAllDevices();
    res.status(200).json({ devices });
  } catch (error) {
    logger.error('Error getting all devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get devices for current user
const getUserDevices = async (req, res) => {
  try {
    const userId = req.user.userId;
    const devices = await deviceModel.getDevicesByUserId(userId);
    res.status(200).json({ devices });
  } catch (error) {
    logger.error('Error getting user devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get device by serial number
const getDeviceBySerialNumber = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const device = await deviceModel.getDeviceBySerialNumber(serialNumber);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if user has access to this device
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      const userDevices = await deviceModel.getDevicesByUserId(userId);
      const hasAccess = userDevices.some(d => d.serial_number === serialNumber);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.status(200).json({ device });
  } catch (error) {
    logger.error('Error getting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update device
const updateDevice = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const updateData = req.body;

    // Check if device exists
    const existingDevice = await deviceModel.getDeviceBySerialNumber(serialNumber);
    if (!existingDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if user has access to this device
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      const userDevices = await deviceModel.getDevicesByUserId(userId);
      const hasAccess = userDevices.some(d => d.serial_number === serialNumber);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const updatedDevice = await deviceModel.updateDevice(serialNumber, updateData);
    
    if (!updatedDevice) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.status(200).json({
      message: 'Device updated successfully',
      device: updatedDevice
    });
  } catch (error) {
    logger.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete device (admin only)
const deleteDevice = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    // Only admins can delete devices
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const deleted = await deviceModel.deleteDevice(serialNumber);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.status(200).json({ message: 'Device deleted successfully' });
  } catch (error) {
    logger.error('Error deleting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Assign device to user (admin only)
const assignDeviceToUser = async (req, res) => {
  try {
    const { serialNumber, userId } = req.body;
    
    // Only admins can assign devices
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    // Check if device exists
    const device = await deviceModel.getDeviceBySerialNumber(serialNumber);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if user exists
    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await deviceModel.assignDeviceToUser(userId, device.id);
    
    res.status(200).json({ message: 'Device assigned to user successfully' });
  } catch (error) {
    logger.error('Error assigning device to user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove device from user (admin only)
const removeDeviceFromUser = async (req, res) => {
  try {
    const { serialNumber, userId } = req.body;
    
    // Only admins can remove device assignments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    // Check if device exists
    const device = await deviceModel.getDeviceBySerialNumber(serialNumber);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const removed = await deviceModel.removeDeviceFromUser(userId, device.id);
    
    if (!removed) {
      return res.status(404).json({ error: 'Device assignment not found' });
    }

    res.status(200).json({ message: 'Device removed from user successfully' });
  } catch (error) {
    logger.error('Error removing device from user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users assigned to a device (admin only)
const getDeviceUsers = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    // Only admins can see device users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    // Check if device exists
    const device = await deviceModel.getDeviceBySerialNumber(serialNumber);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const users = await deviceModel.getDeviceUsers(device.id);
    
    res.status(200).json({ users });
  } catch (error) {
    logger.error('Error getting device users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createDevice,
  getAllDevices,
  getUserDevices,
  getDeviceBySerialNumber,
  updateDevice,
  deleteDevice,
  assignDeviceToUser,
  removeDeviceFromUser,
  getDeviceUsers
}; 