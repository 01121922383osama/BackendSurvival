const express = require('express');
const router = express.Router();
const firebaseUserController = require('../controllers/firebaseUserController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Firebase Users
 *   description: Firebase user management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FirebaseUser:
 *       type: object
 *       properties:
 *         uid:
 *           type: string
 *           description: Firebase user UID
 *         email:
 *           type: string
 *           description: User email
 *         displayName:
 *           type: string
 *           description: User display name
 *         photoURL:
 *           type: string
 *           description: User profile photo URL
 *         disabled:
 *           type: boolean
 *           description: Whether user is disabled
 *         emailVerified:
 *           type: boolean
 *           description: Whether email is verified
 *         isAdmin:
 *           type: boolean
 *           description: Whether user is admin
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation time
 *         lastSignInTime:
 *           type: string
 *           format: date-time
 *           description: Last sign in time
 */

/**
 * @swagger
 * /firebase-users:
 *   get:
 *     summary: Get all Firebase users
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all Firebase users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FirebaseUser'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.getAllFirebaseUsers);

/**
 * @swagger
 * /firebase-users/{uid}:
 *   get:
 *     summary: Get a specific Firebase user
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     responses:
 *       200:
 *         description: Firebase user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/FirebaseUser'
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/:uid', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.getFirebaseUser);

/**
 * @swagger
 * /firebase-users:
 *   post:
 *     summary: Create a new Firebase user
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               displayName:
 *                 type: string
 *               isAdmin:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.createFirebaseUser);

/**
 * @swagger
 * /firebase-users/{uid}:
 *   put:
 *     summary: Update a Firebase user
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               displayName:
 *                 type: string
 *               photoURL:
 *                 type: string
 *               disabled:
 *                 type: boolean
 *               isAdmin:
 *                 type: boolean
 *               deviceToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put('/:uid', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.updateFirebaseUser);

/**
 * @swagger
 * /firebase-users/{uid}:
 *   delete:
 *     summary: Delete a Firebase user
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete('/:uid', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.deleteFirebaseUser);

/**
 * @swagger
 * /firebase-users/{uid}/toggle-status:
 *   patch:
 *     summary: Toggle user disabled status
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disabled
 *             properties:
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.patch('/:uid/toggle-status', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.toggleUserStatus);

/**
 * @swagger
 * /firebase-users/{uid}/reset-password:
 *   patch:
 *     summary: Reset user password
 *     tags: [Firebase Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase user UID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.patch('/:uid/reset-password', authenticateToken, requireAdmin, apiLimiter, firebaseUserController.resetUserPassword);

module.exports = router; 