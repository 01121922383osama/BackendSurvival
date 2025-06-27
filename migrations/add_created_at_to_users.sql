-- Add created_at column to users table with default value of current timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
