const { db } = require('./firebaseInit');

/**
 * Create or update a user in Firestore after successful authentication
 * @param {string} uid - Firebase Auth UID
 * @param {object} userData - User data to store
 * @returns {Promise<object>} - Created/updated user document
 */
async function saveUserToFirestore(uid, userData) {
  try {
    const userRef = db.collection('users').doc(uid);
    
    // Add timestamps
    const now = new Date();
    const userDataWithTimestamps = {
      ...userData,
      updatedAt: now
    };
    
    // If new user, add createdAt
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      userDataWithTimestamps.createdAt = now;
    }
    
    // Update or create the user document
    await userRef.set(userDataWithTimestamps, { merge: true });
    
    // Return the updated user data
    return {
      uid,
      ...userDataWithTimestamps
    };
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
    throw error;
  }
}

/**
 * Update a user's device token in Firestore
 * @param {string} uid - Firebase Auth UID
 * @param {string} deviceToken - FCM device token
 * @returns {Promise<void>}
 */
async function updateUserDeviceToken(uid, deviceToken) {
  try {
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
      deviceToken,
      updatedAt: new Date()
    });
    
    console.log(`Updated device token for user ${uid}`);
  } catch (error) {
    console.error('Error updating device token:', error);
    throw error;
  }
}

/**
 * Get a user by their UID
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<object|null>} - User data or null if not found
 */
async function getUserByUid(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      uid,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

module.exports = {
  saveUserToFirestore,
  updateUserDeviceToken,
  getUserByUid
};
