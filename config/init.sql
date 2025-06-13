-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  params JSONB NOT NULL
);

-- Create index on device_id and timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_logs_device_timestamp ON logs(device_id, timestamp DESC);
