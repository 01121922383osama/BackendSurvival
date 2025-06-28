const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticateToken, requireAdmin, checkDeviceAccess } = require('../middleware/auth');
const { logCreationLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { validateLog, validateUpdateLog } = require('../middleware/validation');

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
 *         topic:
 *           type: string
 *           description: MQTT topic
 *         status_color:
 *           type: string
 *           description: Status color indicator
 *       example:
 *         id: 1
 *         device_id: device123
 *         timestamp: 2023-01-01T12:00:00Z
 *         params: { "fallStatus": "normal", "motionStatus": "active" }
 *         topic: "/Radar60FL/device123/status"
 *         status_color: "green"
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
 * /logs:
 *   get:
 *     summary: Get logs for current user or all logs (admin)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip
 *     responses:
 *       200:
 *         description: A paginated list of logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Log'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 1000
 *                     limit:
 *                       type: integer
 *                       example: 100
 *                     offset:
 *                       type: integer
 *                       example: 0
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests
 */
router.get('/', authenticateToken, apiLimiter, logController.getLogs);

/**
 * @swagger
 * /logs/all:
 *   get:
 *     summary: Get all logs (admin only)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip
 *     responses:
 *       200:
 *         description: A paginated list of all logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/all', authenticateToken, requireAdmin, apiLimiter, logController.getAllLogs);

/**
 * @swagger
 * /logs/device/{deviceId}:
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of logs to return
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
 *       403:
 *         description: Access denied to this device
 *       429:
 *         description: Too many requests
 */
router.get('/device/:deviceId', authenticateToken, checkDeviceAccess, apiLimiter, logController.getLogsByDeviceId);

/**
 * @swagger
 * /logs/id/{id}:
 *   get:
 *     summary: Get log by ID
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Log details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Log'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Log not found
 *       429:
 *         description: Too many requests
 */
router.get('/id/:id', authenticateToken, apiLimiter, logController.getLogById);

/**
 * @swagger
 * /logs/{id}:
 *   put:
 *     summary: Update a log
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Log ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: Log updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Log not found
 */
router.put('/:id', authenticateToken, requireAdmin, validateUpdateLog, logController.updateLog);

/**
 * @swagger
 * /logs/{id}:
 *   delete:
 *     summary: Delete a log
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Log ID
 *     responses:
 *       200:
 *         description: Log deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Log not found
 */
router.delete('/:id', authenticateToken, requireAdmin, logController.deleteLog);

/**
 * @swagger
 * /logs/count:
 *   get:
 *     summary: Get total log count
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total log count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 1000
 *       401:
 *         description: Unauthorized
 */
router.get('/count', authenticateToken, apiLimiter, logController.getLogCount);

module.exports = router;
