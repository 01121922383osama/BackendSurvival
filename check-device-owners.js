require('dotenv').config({ path: './temp.env' });
const deviceModel = require('./models/device');
const userService = require('./firebase/userService');
const logger = require('./config/logger');
const db = require('./config/db');

async function checkDeviceOwners() {
  try {
    console.log('=== DEVICE OWNERS CHECK ===');
    
    // Get all devices
    const devices = await deviceModel.getAllDevices();
    console.log(`Total devices: ${devices.length}`);
    
    for (const device of devices) {
      console.log(`\nDevice: ${device.serial_number}`);
      console.log(`  Name: ${device.name}`);
      console.log(`  Owners: ${JSON.stringify(device.owners)}`);
      console.log(`  Owners type: ${typeof device.owners}`);
      
      if (device.owners && device.owners.length > 0) {
        console.log(`  Number of owners: ${device.owners.length}`);
        
        for (const ownerId of device.owners) {
          console.log(`  Checking owner: ${ownerId}`);
          const user = await userService.getUserById(ownerId);
          if (user) {
            console.log(`    User found: ${user.email || user.displayName || user.uid}`);
            console.log(`    Has device token: ${!!user.deviceToken}`);
            if (user.deviceToken) {
              console.log(`    Token preview: ${user.deviceToken.substring(0, 20)}...`);
            }
          } else {
            console.log(`    User not found in Firebase`);
          }
        }
      } else {
        console.log(`  No owners assigned`);
      }
    }
    
    // Query the raw value from the database
    const result = await db.query(
      "SELECT serial_number, owners, pg_typeof(owners) as owners_pg_type FROM devices WHERE serial_number = $1",
      ['701D08096A55']
    );
    if (result.rows.length === 0) {
      console.log('Device not found');
      return;
    }
    const row = result.rows[0];
    console.log('serial_number:', row.serial_number);
    console.log('owners (raw):', row.owners);
    console.log('owners_pg_type:', row.owners_pg_type);
    if (typeof row.owners === 'string') {
      try {
        const parsed = JSON.parse(row.owners);
        console.log('owners (parsed as JSON):', parsed);
        console.log('owners (parsed type):', Array.isArray(parsed) ? 'array' : typeof parsed);
      } catch (e) {
        console.log('owners could not be parsed as JSON:', e.message);
      }
    } else if (Array.isArray(row.owners)) {
      console.log('owners is already an array:', row.owners);
    } else {
      console.log('owners is of type:', typeof row.owners);
    }
    
    console.log('\n=== END DEVICE OWNERS CHECK ===');
  } catch (error) {
    console.error('Error checking device owners:', error);
  }
}

// Run the check
checkDeviceOwners().then(() => {
  console.log('Check completed');
  process.exit(0);
}).catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
}); 