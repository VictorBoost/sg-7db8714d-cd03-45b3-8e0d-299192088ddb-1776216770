-- Add new columns to bids table for complete bid information
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS estimated_timeline text,
ADD COLUMN IF NOT EXISTS trade_certificate_url text,
ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true;

-- Add RLS policies for bids
DROP POLICY IF EXISTS "providers_create_bids" ON bids;
DROP POLICY IF EXISTS "providers_view_own_bids" ON bids;
DROP POLICY IF EXISTS "clients_view_project_bids" ON bids;

CREATE POLICY "providers_create_bids" ON bids
  FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id 
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE is_provider = true AND verification_status = 'approved'
    )
  );

CREATE POLICY "providers_view_own_bids" ON bids
  FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "clients_view_project_bids" ON bids
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT client_id FROM projects WHERE id = project_id
    )
    AND (
      -- For non-DH projects, all bids are visible
      is_visible = true
      OR 
      -- For DH projects, only show bids from DH-verified providers
      (
        SELECT p.domestic_helper_verified 
        FROM profiles p 
        WHERE p.id = provider_id
      ) = true
    )
  );

CREATE POLICY "providers_update_own_bids" ON bids
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);