-- Add the missing account_status column to fix the TypeScript error
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

-- Ensure the client account is set up properly
UPDATE profiles 
SET is_client = true 
WHERE email = 'goodnessgamo@gmail.com';