-- Add proration_days to commission settings if missing
ALTER TABLE commission_tiers 
ADD COLUMN IF NOT EXISTS proration_days INTEGER DEFAULT 60;

-- Set default proration period to 60 days
UPDATE commission_tiers SET proration_days = 60;

-- Get current settings
SELECT * FROM commission_tiers LIMIT 1;