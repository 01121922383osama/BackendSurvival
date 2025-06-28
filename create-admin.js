// Create admin user script
const bcrypt = require('bcrypt');
const userModel = require('./models/user');
const logger = require('./config/logger');

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await userModel.findUserByEmail('admin@example.com');
    
    if (existingAdmin) {
      logger.info('Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = await userModel.createUser(
      'admin@example.com',
      'admin123',
      'admin'
    );

    logger.info('Admin user created successfully:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });

    console.log('\n=== Admin User Created ===');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('========================\n');

  } catch (error) {
    logger.error('Error creating admin user:', error);
    console.error('Failed to create admin user:', error.message);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('Admin user creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
