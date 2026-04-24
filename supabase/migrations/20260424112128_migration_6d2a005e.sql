-- Phase 5: Update RLS policies for escrow (without admin column check for now)

-- Add platform setting for auto-release window (10 seconds for testing)
INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('auto_release_window_seconds', '10')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '10';

-- Create index for auto-release query performance
CREATE INDEX IF NOT EXISTS idx_contracts_auto_release 
  ON contracts(auto_release_eligible_at, payment_status)
  WHERE payment_status = 'held';

-- Allow clients to approve their own payments
DROP POLICY IF EXISTS "clients_can_approve_own_payments" ON contracts;
CREATE POLICY "clients_can_approve_own_payments" ON contracts
  FOR UPDATE
  USING (
    auth.uid() = client_id 
    AND payment_status = 'held'
  )
  WITH CHECK (
    auth.uid() = client_id
  );

-- Allow users to read their own escrow details
DROP POLICY IF EXISTS "users_read_own_escrow_status" ON contracts;
CREATE POLICY "users_read_own_escrow_status" ON contracts
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);