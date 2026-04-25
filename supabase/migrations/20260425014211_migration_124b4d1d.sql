-- Fix: Add missing details column to bot_activity_logs
ALTER TABLE bot_activity_logs
ADD COLUMN IF NOT EXISTS details jsonb;

-- Verify column added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'bot_activity_logs'
ORDER BY ordinal_position;