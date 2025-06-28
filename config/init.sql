-- Create users table with role support
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create devices table to store device information
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  serial_number TEXT UNIQUE NOT NULL,
  name TEXT,
  location TEXT,
  is_connected BOOLEAN DEFAULT false,
  has_alert BOOLEAN DEFAULT false,
  alert_message TEXT,
  last_updated TIMESTAMPTZ,
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT true,
  is_fall BOOLEAN DEFAULT false,
  owners JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_devices junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  params JSONB NOT NULL,
  topic TEXT,
  status_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on device_id and timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_logs_device_timestamp ON logs(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device ON user_devices(device_id);
