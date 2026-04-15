-- Create additional_charges table
CREATE TABLE additional_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'paid')),
  approved_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  platform_fee NUMERIC DEFAULT 0,
  payment_processing_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  commission_rate NUMERIC,
  commission_amount NUMERIC,
  net_to_provider NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE additional_charges ENABLE ROW LEVEL SECURITY;

-- Providers can create additional charge requests for their contracts
CREATE POLICY "providers_create_charges" ON additional_charges
  FOR INSERT WITH CHECK (
    auth.uid() = provider_id AND
    auth.uid() IN (
      SELECT provider_id FROM contracts WHERE id = contract_id
    )
  );

-- Both parties can view charges for their contracts
CREATE POLICY "parties_view_charges" ON additional_charges
  FOR SELECT USING (
    auth.uid() IN (
      SELECT client_id FROM contracts WHERE id = contract_id
      UNION
      SELECT provider_id FROM contracts WHERE id = contract_id
    )
  );

-- Clients can update (approve/decline) pending charges
CREATE POLICY "clients_update_charges" ON additional_charges
  FOR UPDATE USING (
    auth.uid() = client_id AND
    status = 'pending'
  );

-- Indexes
CREATE INDEX idx_additional_charges_contract ON additional_charges(contract_id);
CREATE INDEX idx_additional_charges_status ON additional_charges(status);
CREATE INDEX idx_additional_charges_provider ON additional_charges(provider_id);
CREATE INDEX idx_additional_charges_client ON additional_charges(client_id);

COMMENT ON TABLE additional_charges IS 'Additional charges requested by service providers during or after a project';