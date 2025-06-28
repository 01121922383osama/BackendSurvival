const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { validateUpdateUser } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests
 */
router.get('/', authenticateToken, requireAdmin, apiLimiter, userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.get('/:id', authenticateToken, requireOwnerOrAdmin, apiLimiter, userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 *       429:
 *         description: Too many requests
 */
router.put('/:id', authenticateToken, requireOwnerOrAdmin, apiLimiter, validateUpdateUser, userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 */
router.delete('/:id', authenticateToken, requireAdmin, apiLimiter, userController.deleteUser);

/**
 * @swagger
 * /users/{id}/devices:
 *   get:
 *     summary: Get devices for a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: A list of devices for the user
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/:id/devices', authenticateToken, requireOwnerOrAdmin, apiLimiter, userController.getUserDevices);

/**
 * @swagger
 * /users/{id}/devices:
 *   post:
 *     summary: Add a device for a specific user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Device added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/devices', authenticateToken, requireOwnerOrAdmin, apiLimiter, userController.addUserDevice);

module.exports = router;
