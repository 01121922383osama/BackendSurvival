const { admin } = require('../firebase/firebaseInit');
const { saveUserToFirestore, updateUserDeviceToken } = require('../firebase/userService');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Create a Firebase user and link with backend user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const createFirebaseUser = async (req, res) => {
  try {
    const { email, password, name, deviceToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name || email.split('@')[0],
      disabled: false
    });

    // Save user to Firestore
    const userData = {
      name: name || email.split('@')[0],
      email,
      deviceToken: deviceToken || null,
      imageUrl: null
    };

    await saveUserToFirestore(userRecord.uid, userData);

    // Create user in backend database
    const backendUser = await User.createUser(email, password, 'user', userRecord.uid);

    // Create and sign JWT token
    const token = jwt.sign(
      { id: backendUser.id, email: backendUser.email, role: backendUser.role, firebaseUid: userRecord.uid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: backendUser.id,
        email: backendUser.email,
        role: backendUser.role,
        firebaseUid: userRecord.uid,
        name: userData.name
      }
    });
  } catch (error) {
    console.error('Firebase user creation error:', error);

    // Handle Firebase specific errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Error creating user' });
  }
};

/**
 * Sign in with Firebase and backend
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const signInWithFirebase = async (req, res) => {
  try {
    const { email, password, deviceToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user in backend database first
    const backendUser = await User.findUserByEmail(email);
    if (!backendUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get Firebase user
    let firebaseUid = backendUser.firebase_uid;
    let firebaseUser;

    // If no Firebase UID stored, try to find by email
    if (!firebaseUid) {
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
        firebaseUid = firebaseUser.uid;

        // Update backend user with Firebase UID
        await User.updateUser(backendUser.id, email, null, backendUser.role, firebaseUid);
      } catch (fbError) {
        // If user doesn't exist in Firebase, create one
        if (fbError.code === 'auth/user-not-found') {
          const newFirebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: backendUser.name || email.split('@')[0],
            disabled: false
          });

          firebaseUid = newFirebaseUser.uid;

          // Update backend user with Firebase UID
          await User.updateUser(backendUser.id, email, null, backendUser.role, firebaseUid);

          // Create Firestore user
          await saveUserToFirestore(firebaseUid, {
            name: backendUser.name || email.split('@')[0],
            email,
            deviceToken: deviceToken || null,
            imageUrl: null
          });
        } else {
          throw fbError;
        }
      }
    } else {
      // Verify Firebase user exists
      try {
        firebaseUser = await admin.auth().getUser(firebaseUid);
      } catch (fbError) {
        if (fbError.code === 'auth/user-not-found') {
          // Create new Firebase user if not found
          const newFirebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: backendUser.name || email.split('@')[0],
            disabled: false
          });

          firebaseUid = newFirebaseUser.uid;

          // Update backend user with new Firebase UID
          await User.updateUser(backendUser.id, email, null, backendUser.role, firebaseUid);
        } else {
          throw fbError;
        }
      }
    }

    // Update device token if provided
    if (deviceToken) {
      await updateUserDeviceToken(firebaseUid, deviceToken);
    }

    // Create and sign JWT token
    const token = jwt.sign(
      { id: backendUser.id, email: backendUser.email, role: backendUser.role, firebaseUid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: backendUser.id,
        email: backendUser.email,
        role: backendUser.role,
        firebaseUid
      }
    });
  } catch (error) {
    console.error('Firebase sign in error:', error);
    res.status(500).json({ error: 'Error signing in' });
  }
};

/**
 * Update user profile including Firebase Auth and Firestore
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, imageUrl } = req.body;

    // Get backend user
    const backendUser = await User.getUserById(userId);
    if (!backendUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const firebaseUid = backendUser.firebase_uid;
    if (!firebaseUid) {
      return res.status(400).json({ error: 'User not linked to Firebase' });
    }

    // Update Firebase Auth user
    const updateAuthData = {};
    if (name) updateAuthData.displayName = name;
    if (email) updateAuthData.email = email;
    if (imageUrl) updateAuthData.photoURL = imageUrl;

    if (Object.keys(updateAuthData).length > 0) {
      await admin.auth().updateUser(firebaseUid, updateAuthData);
    }

    // Update Firestore user
    const firestoreData = {};
    if (name) firestoreData.name = name;
    if (email) firestoreData.email = email;
    if (imageUrl) firestoreData.imageUrl = imageUrl;

    if (Object.keys(firestoreData).length > 0) {
      await saveUserToFirestore(firebaseUid, firestoreData);
    }

    // Update backend user
    const updatedUser = await User.updateUser(
      userId,
      email || backendUser.email,
      null,
      backendUser.role,
      firebaseUid
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        firebaseUid
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

module.exports = {
  createFirebaseUser,
  signInWithFirebase,
  updateUserProfile
};
