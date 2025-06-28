-- Add topic column to logs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='logs' AND column_name='topic'
    ) THEN
        ALTER TABLE logs ADD COLUMN topic TEXT;
    END IF;
END $$;

-- Add status_color column to logs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='logs' AND column_name='status_color'
    ) THEN
        ALTER TABLE logs ADD COLUMN status_color TEXT;
    END IF;
END $$;

-- Make sure devices table exists
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
