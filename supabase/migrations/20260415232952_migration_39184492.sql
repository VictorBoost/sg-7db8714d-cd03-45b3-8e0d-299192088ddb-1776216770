-- Create routine_contracts table to track ongoing routine arrangements
CREATE TABLE IF NOT EXISTS routine_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'custom')),
  custom_days INTEGER NULL, -- Only used when frequency is 'custom'
  selected_days TEXT[] NULL, -- Days of week for Domestic Helper (e.g., ['monday', 'wednesday', 'friday'])
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  
  -- Tracking
  client_agreed BOOLEAN DEFAULT false,
  provider_agreed BOOLEAN DEFAULT false,
  client_agreed_at TIMESTAMP WITH TIME ZONE NULL,
  provider_agreed_at TIMESTAMP WITH TIME ZONE NULL,
  activated_at TIMESTAMP WITH TIME ZONE NULL,
  
  paused_at TIMESTAMP WITH TIME ZONE NULL,
  paused_by UUID NULL REFERENCES profiles(id),
  cancelled_at TIMESTAMP WITH TIME ZONE NULL,
  cancelled_by UUID NULL REFERENCES profiles(id),
  
  -- Metrics
  sessions_completed INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  last_session_date DATE NULL,
  next_session_date DATE NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_routine_contracts_client ON routine_contracts(client_id);
CREATE INDEX idx_routine_contracts_provider ON routine_contracts(provider_id);
CREATE INDEX idx_routine_contracts_status ON routine_contracts(status);
CREATE INDEX idx_routine_contracts_next_session ON routine_contracts(next_session_date);

-- Add RLS policies
ALTER TABLE routine_contracts ENABLE ROW LEVEL SECURITY;

-- Users can view their own routine contracts
CREATE POLICY "users_view_own_routine_contracts"
ON routine_contracts FOR SELECT
USING (auth.uid() IN (client_id, provider_id));

-- Users can create routine contracts for their own contracts
CREATE POLICY "users_create_routine_contracts"
ON routine_contracts FOR INSERT
WITH CHECK (
  auth.uid() IN (client_id, provider_id) AND
  auth.uid() IN (
    SELECT contracts.client_id FROM contracts WHERE contracts.id = original_contract_id
    UNION
    SELECT contracts.provider_id FROM contracts WHERE contracts.id = original_contract_id
  )
);

-- Users can update their own routine contracts (for pausing/cancelling)
CREATE POLICY "users_update_own_routine_contracts"
ON routine_contracts FOR UPDATE
USING (auth.uid() IN (client_id, provider_id));

-- Admin can view all routine contracts
CREATE POLICY "admin_view_all_routine_contracts"
ON routine_contracts FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE email LIKE '%@bluetika.co.nz'
  )
);

COMMENT ON TABLE routine_contracts IS 'Tracks ongoing routine service arrangements between clients and providers';
COMMENT ON COLUMN routine_contracts.selected_days IS 'Days of week for Domestic Helper services (e.g., monday, wednesday, friday)';
COMMENT ON COLUMN routine_contracts.custom_days IS 'Number of days between sessions when frequency is custom';