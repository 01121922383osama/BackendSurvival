-- Add role column to users table with default value 'user'
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Update existing users to have role 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
