const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateToken, requireAdmin, checkDeviceAccess } = require('../middleware/auth');
const deviceModel = require('../models/device');
const logger = require('../config/logger');

// Public routes (no authentication required)
// None for devices - all require authentication

// Protected routes (authentication required)
router.use(authenticateToken);

// Device management routes
router.post('/', requireAdmin, deviceController.createDevice);
router.get('/', deviceController.getUserDevices); // Users see their devices, admins see all
router.get('/all', requireAdmin, deviceController.getAllDevices); // Admin only - all devices
router.get('/online', requireAdmin, deviceController.getOnlineDevices); // Admin only - online devices

// Device-specific routes
router.get('/:serialNumber', checkDeviceAccess, deviceController.getDeviceBySerialNumber);
router.put('/:serialNumber', checkDeviceAccess, deviceController.updateDevice);
router.delete('/:serialNumber', requireAdmin, deviceController.deleteDevice);

// Device-user assignment routes (admin only)
router.post('/:serialNumber/assign', requireAdmin, deviceController.assignDeviceToUser);
router.delete('/:serialNumber/assign', requireAdmin, deviceController.removeDeviceFromUser);
router.get('/:serialNumber/users', requireAdmin, deviceController.getDeviceUsers);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    logger.debug('GET /devices/stats - Request received');
    
    // Get all devices
    const devices = await deviceModel.getAllDevices();
    
    // Calculate statistics
    const stats = {
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.is_connected).length,
      offlineDevices: devices.filter(d => !d.is_connected).length,
      devicesWithAlerts: devices.filter(d => d.has_alert).length,
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      stats: stats,
      devices: devices
    });
  } catch (error) {
    logger.error('Error getting device statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device statistics',
      error: error.message
    });
  }
});

module.exports = router; 