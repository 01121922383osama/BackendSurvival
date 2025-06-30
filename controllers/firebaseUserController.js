const admin = require('../firebase/firebaseInit');
const logger = require('../config/logger');
const db = admin.firestore();

/**
 * Get all Firebase users with Firestore data
 */
const getAllFirebaseUsers = async (req, res) => {
    try {
        // Get all users from Firebase Auth
        const listUsersResult = await admin.auth().listUsers();
        const authUsers = listUsersResult.users;

        // Get all users from Firestore
        const firestoreSnapshot = await db.collection('users').get();
        const firestoreUsers = {};
        firestoreSnapshot.docs.forEach(doc => {
            firestoreUsers[doc.id] = { id: doc.id, ...doc.data() };
        });

        // Get all devices to count ownership
        const devicesSnapshot = await db.collection('devices').get();
        const userDeviceCounts = {};
        devicesSnapshot.docs.forEach(doc => {
            const deviceData = doc.data();
            // Defensive: ensure owners is always an array
            const owners = Array.isArray(deviceData.owners) ? deviceData.owners : [];
            owners.forEach(ownerId => {
                if (ownerId) {
                    userDeviceCounts[ownerId] = (userDeviceCounts[ownerId] || 0) + 1;
                }
            });
        });

        // Combine Auth and Firestore data
        const users = authUsers.map(authUser => {
            const firestoreData = firestoreUsers[authUser.uid] || {};
            const deviceCount = userDeviceCounts[authUser.uid] || 0;

            // Safely convert Firestore Timestamps to ISO strings
            function safeToISOString(val) {
                if (!val) return null;
                if (typeof val === 'string') return val;
                if (val.toDate) return val.toDate().toISOString();
                if (val instanceof Date) return val.toISOString();
                return null;
            }

            return {
                uid: authUser.uid,
                email: authUser.email,
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
                disabled: authUser.disabled,
                emailVerified: authUser.emailVerified,
                createdAt: authUser.metadata.creationTime,
                lastSignInTime: authUser.metadata.lastSignInTime,
                lastRefreshTime: authUser.metadata.lastRefreshTime,
                providerData: authUser.providerData,
                customClaims: authUser.customClaims,
                // Firestore data
                name: firestoreData.name,
                isAdmin: firestoreData.isAdmin || false,
                deviceToken: firestoreData.deviceToken,
                imageUrl: firestoreData.imageUrl,
                firestoreCreatedAt: safeToISOString(firestoreData.createdAt),
                firestoreUpdatedAt: safeToISOString(firestoreData.updatedAt),
                // Device count
                deviceCount: deviceCount
            };
        });

        res.status(200).json({ users });
    } catch (error) {
        logger.error('Error getting Firebase users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get a specific Firebase user by UID
 */
const getFirebaseUser = async (req, res) => {
    try {
        const { uid } = req.params;

        // Get user from Firebase Auth
        const authUser = await admin.auth().getUser(uid);

        // Get user from Firestore
        const firestoreDoc = await db.collection('users').doc(uid).get();
        const firestoreData = firestoreDoc.exists ? firestoreDoc.data() : {};

        // Get device count for this user
        const devicesSnapshot = await db.collection('devices').where('owners', 'array-contains', uid).get();
        const deviceCount = devicesSnapshot.size;

        // Safely convert Firestore Timestamps to ISO strings
        function safeToISOString(val) {
            if (!val) return null;
            if (typeof val === 'string') return val;
            if (val.toDate) return val.toDate().toISOString();
            if (val instanceof Date) return val.toISOString();
            return null;
        }

        const user = {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            disabled: authUser.disabled,
            emailVerified: authUser.emailVerified,
            createdAt: authUser.metadata.creationTime,
            lastSignInTime: authUser.metadata.lastSignInTime,
            lastRefreshTime: authUser.metadata.lastRefreshTime,
            providerData: authUser.providerData,
            customClaims: authUser.customClaims,
            // Firestore data
            name: firestoreData.name,
            isAdmin: firestoreData.isAdmin || false,
            deviceToken: firestoreData.deviceToken,
            imageUrl: firestoreData.imageUrl,
            firestoreCreatedAt: safeToISOString(firestoreData.createdAt),
            firestoreUpdatedAt: safeToISOString(firestoreData.updatedAt),
            // Device count
            deviceCount: deviceCount
        };

        res.status(200).json({ user });
    } catch (error) {
        logger.error('Error getting Firebase user:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create a new Firebase user
 */
const createFirebaseUser = async (req, res) => {
    try {
        const { email, password, displayName, isAdmin = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: displayName || email.split('@')[0],
            disabled: false
        });

        // Set admin custom claim if needed
        if (isAdmin) {
            await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        }

        // Save user to Firestore
        const userData = {
            name: displayName || email.split('@')[0],
            email,
            isAdmin,
            deviceToken: null,
            imageUrl: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        res.status(201).json({
            message: 'User created successfully',
            user: {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: userRecord.displayName,
                isAdmin
            }
        });
    } catch (error) {
        logger.error('Error creating Firebase user:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Update a Firebase user
 */
const updateFirebaseUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const { email, displayName, photoURL, disabled, isAdmin, deviceToken } = req.body;

        // Update Firebase Auth user
        const updateAuthData = {};
        if (email !== undefined) updateAuthData.email = email;
        if (displayName !== undefined) updateAuthData.displayName = displayName;
        if (photoURL !== undefined) updateAuthData.photoURL = photoURL;
        if (disabled !== undefined) updateAuthData.disabled = disabled;

        if (Object.keys(updateAuthData).length > 0) {
            await admin.auth().updateUser(uid, updateAuthData);
        }

        // Update admin custom claim if needed
        if (isAdmin !== undefined) {
            await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
        }

        // Update Firestore user
        const updateFirestoreData = {};
        if (displayName !== undefined) updateFirestoreData.name = displayName;
        if (email !== undefined) updateFirestoreData.email = email;
        if (isAdmin !== undefined) updateFirestoreData.isAdmin = isAdmin;
        if (deviceToken !== undefined) updateFirestoreData.deviceToken = deviceToken;
        if (photoURL !== undefined) updateFirestoreData.imageUrl = photoURL;

        if (Object.keys(updateFirestoreData).length > 0) {
            updateFirestoreData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            await db.collection('users').doc(uid).update(updateFirestoreData);
        }

        res.status(200).json({
            message: 'User updated successfully',
            user: { uid, ...updateAuthData, ...updateFirestoreData }
        });
    } catch (error) {
        logger.error('Error updating Firebase user:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Delete a Firebase user
 */
const deleteFirebaseUser = async (req, res) => {
    try {
        const { uid } = req.params;

        // Delete user from Firebase Auth
        await admin.auth().deleteUser(uid);

        // Delete user from Firestore
        await db.collection('users').doc(uid).delete();

        res.status(200).json({
            message: 'User deleted successfully',
            uid
        });
    } catch (error) {
        logger.error('Error deleting Firebase user:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Disable/Enable a Firebase user
 */
const toggleUserStatus = async (req, res) => {
    try {
        const { uid } = req.params;
        const { disabled } = req.body;

        if (typeof disabled !== 'boolean') {
            return res.status(400).json({ error: 'Disabled status must be a boolean' });
        }

        await admin.auth().updateUser(uid, { disabled });

        res.status(200).json({
            message: `User ${disabled ? 'disabled' : 'enabled'} successfully`,
            user: { uid, disabled }
        });
    } catch (error) {
        logger.error('Error toggling user status:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Reset user password
 */
const resetUserPassword = async (req, res) => {
    try {
        const { uid } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        await admin.auth().updateUser(uid, { password: newPassword });

        res.status(200).json({
            message: 'Password reset successfully',
            uid
        });
    } catch (error) {
        logger.error('Error resetting user password:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllFirebaseUsers,
    getFirebaseUser,
    createFirebaseUser,
    updateFirebaseUser,
    deleteFirebaseUser,
    toggleUserStatus,
    resetUserPassword
}; 