const userService = require('../firebase/userService');
const deviceService = require('../firebase/deviceService');
const logger = require('../config/logger');

const getAllUsers = async (req, res, next) => {
  try {
    // Get all users and device counts in parallel
    const [users, deviceCounts] = await Promise.all([
      userService.getAllUsers(),
      deviceService.countDevicesPerUser()
    ]);
    
    // Add device count to each user
    const usersWithDeviceCounts = users.map(user => ({
      ...user,
      deviceCount: deviceCounts[user.id] || 0
    }));
    
    res.status(200).json({ users: usersWithDeviceCounts });
  } catch (error) {
    logger.error('Error getting all users:', error);
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get user and their devices in parallel
    const [user, devices] = await Promise.all([
      userService.getUserById(id),
      deviceService.getDevicesByUser(id)
    ]);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Add device count and devices to user object
    const userWithDevices = {
      ...user,
      deviceCount: devices.length,
      devices: devices
    };
    
    res.status(200).json({ user: userWithDevices });
  } catch (error) {
    logger.error(`Error getting user with ID ${req.params.id}:`, error);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    await userService.updateUser(id, userData);
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting user with ID ${req.params.id}:`, error);
    next(error);
  }
};

const getUserDevices = async (req, res, next) => {
  try {
    const { id } = req.params;
    const devices = await deviceService.getDevicesByUser(id);
    res.status(200).json({ devices });
  } catch (error) {
    logger.error(`Error getting devices for user with ID ${req.params.id}:`, error);
    next(error);
  }
};

const addUserDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deviceData = req.body;
    const device = await deviceService.createDevice(id, deviceData);
    res.status(201).json({ message: 'Device added successfully', device });
  } catch (error) {
    logger.error(`Error adding device for user with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserDevices,
  addUserDevice,
};
