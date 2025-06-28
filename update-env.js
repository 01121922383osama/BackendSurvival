// Script to update .env file with Railway PostgreSQL connection details
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '.env');

// Railway PostgreSQL connection details
const railwayDbConfig = {
  DATABASE_URL: 'postgresql://postgres:NObLVVggqwLySvLypiTiMpaFOmZMpfbz@hopper.proxy.rlwy.net:54059/railway',
  PGHOST: 'hopper.proxy.rlwy.net',
  PGPORT: '54059',
  PGDATABASE: 'railway',
  PGUSER: 'postgres',
  PGPASSWORD: 'NObLVVggqwLySvLypiTiMpaFOmZMpfbz'
};

async function updateEnvFile() {
  try {
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.log('.env file does not exist. Creating a new one...');

      // Create a new .env file with Railway PostgreSQL connection details
      const envContent = Object.entries(railwayDbConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      fs.writeFileSync(envPath, envContent + '\n');
      console.log('.env file created successfully with Railway PostgreSQL connection details.');
      return;
    }

    // Read existing .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    // Update or add Railway PostgreSQL connection details
    const updatedLines = [];
    const processedKeys = new Set();

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) {
        updatedLines.push(line);
        continue;
      }

      // Check if line is a comment
      if (line.startsWith('#')) {
        updatedLines.push(line);
        continue;
      }

      // Check if line contains a key-value pair
      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) {
        updatedLines.push(line);
        continue;
      }

      const [, key, value] = match;
      const trimmedKey = key.trim();

      // Update if key exists in Railway PostgreSQL connection details
      if (railwayDbConfig[trimmedKey] !== undefined) {
        updatedLines.push(`${trimmedKey}=${railwayDbConfig[trimmedKey]}`);
        processedKeys.add(trimmedKey);
      } else {
        updatedLines.push(line);
      }
    }

    // Add missing Railway PostgreSQL connection details
    for (const [key, value] of Object.entries(railwayDbConfig)) {
      if (!processedKeys.has(key)) {
        updatedLines.push(`${key}=${value}`);
      }
    }

    // Write updated content back to .env file
    fs.writeFileSync(envPath, updatedLines.join('\n') + '\n');
    console.log('.env file updated successfully with Railway PostgreSQL connection details.');

    // Display the updated environment variables
    console.log('\nUpdated environment variables:');
    for (const [key, value] of Object.entries(railwayDbConfig)) {
      console.log(`${key}=${value}`);
    }

    console.log('\nYou can now run "npm start" to start the server with Railway PostgreSQL connection.');

  } catch (error) {
    console.error('Error updating .env file:', error);
  }
}

updateEnvFile();
