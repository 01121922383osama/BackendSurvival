const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateToken, requireAdmin, checkDeviceAccess } = require('../middleware/auth');

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

module.exports = router; 