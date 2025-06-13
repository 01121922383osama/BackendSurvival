-- Additional indexes for high-volume log operations
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_device_id ON logs(device_id);

-- Optimize PostgreSQL for log operations
ALTER TABLE logs SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE logs SET (autovacuum_analyze_scale_factor = 0.025);

-- Add comment to logs table for documentation
COMMENT ON TABLE logs IS 'Stores device logs with high volume capacity (10,000+ logs/day)';

-- Create a view for recent logs (last 24 hours)
CREATE OR REPLACE VIEW recent_logs AS
SELECT * FROM logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
