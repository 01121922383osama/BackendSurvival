const admin = require('./firebaseInit');
const logger = require('../config/logger');
const db = admin.firestore();

const createUser = async (uid, userData) => {
  try {
    await db.collection('users').doc(uid).set({
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`User ${uid} created in Firestore`);
    return { uid, ...userData };
  } catch (error) {
    logger.error(`Error creating user ${uid} in Firestore:`, error);
    throw new Error('Could not create user in Firestore.');
  }
};

const getUserById = async (uid) => {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    logger.error(`Error fetching user ${uid}:`, error);
    throw new Error('Could not fetch user.');
  }
};

const getAllUsers = async () => {
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error fetching all users:', error);
    throw new Error('Could not fetch all users.');
  }
};

const updateUser = async (uid, userData) => {
  try {
    await db.collection('users').doc(uid).update({
      ...userData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`User ${uid} updated in Firestore`);
  } catch (error) {
    logger.error(`Error updating user ${uid} in Firestore:`, error);
    throw new Error('Could not update user in Firestore.');
  }
};

const deleteUser = async (uid) => {
  try {
    // This will delete the user from Firestore, but not from Firebase Auth
    await db.collection('users').doc(uid).delete();
    await admin.auth().deleteUser(uid);
    logger.info(`User ${uid} deleted from Firestore and Auth`);
  } catch (error) {
    logger.error(`Error deleting user ${uid}:`, error);
    throw new Error('Could not delete user.');
  }
};

module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
};
