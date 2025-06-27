const userModel = require('../models/user');
const logger = require('../config/logger');

// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userModel.getAllUsers();
    res.status(200).json({ users });
  } catch (error) {
    logger.error('Error getting all users:', error);
    next(error);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userModel.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    logger.error(`Error getting user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await userModel.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const updatedUser = await userModel.updateUser(id, email, password);
    
    res.status(200).json({ 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({ message: error.message });
    }
    logger.error(`Error updating user with ID ${req.params.id}:`, error);
    next(error);
  }
};

// Delete user
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await userModel.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const result = await userModel.deleteUser(id);
    
    if (result) {
      res.status(200).json({ message: 'User deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  } catch (error) {
    logger.error(`Error deleting user with ID ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
