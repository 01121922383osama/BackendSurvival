-- Add topic and status_color columns to logs table
ALTER TABLE logs 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS status_color TEXT; 