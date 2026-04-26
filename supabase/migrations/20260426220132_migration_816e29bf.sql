-- Add account_status column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Verify column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'account_status';