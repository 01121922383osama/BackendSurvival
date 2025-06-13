const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticateToken } = require('../middleware/auth');
const { logCreationLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { validateLog } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Log management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Log:
 *       type: object
 *       required:
 *         - device_id
 *         - timestamp
 *         - params
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the log
 *         device_id:
 *           type: string
 *           description: The device identifier
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: The ISO 8601 timestamp of the log
 *         params:
 *           type: object
 *           description: Custom parameters for the log
 *       example:
 *         id: 1
 *         device_id: device123
 *         timestamp: 2023-01-01T12:00:00Z
 *         params: { "fallStatus": "normal", "motionStatus": "active" }
 */

/**
 * @swagger
 * /logs:
 *   post:
 *     summary: Create a new log
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - timestamp
 *               - params
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Device identifier
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 timestamp
 *               params:
 *                 type: object
 *                 description: Custom parameters for the log
 *     responses:
 *       201:
 *         description: Log created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Log created successfully
 *                 id:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests
 */
router.post('/', authenticateToken, logCreationLimiter, validateLog, logController.createLog);

/**
 * @swagger
 * /logs/{deviceId}:
 *   get:
 *     summary: Get logs for a specific device
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         schema:
 *           type: string
 *         required: true
 *         description: Device identifier
 *     responses:
 *       200:
 *         description: A list of logs for the device
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Log'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests
 */
router.get('/:deviceId', authenticateToken, apiLimiter, logController.getLogsByDeviceId);

module.exports = router;
