-- Create evidence photos table
CREATE TABLE contract_evidence_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  uploader_role TEXT NOT NULL CHECK (uploader_role IN ('client', 'provider')),
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'not_uploaded' CHECK (status IN ('not_uploaded', 'uploaded', 'confirmed')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_id, photo_type, uploader_role)
);

-- Add RLS policies
ALTER TABLE contract_evidence_photos ENABLE ROW LEVEL SECURITY;

-- Both parties can view evidence for their contracts
CREATE POLICY "view_contract_evidence" ON contract_evidence_photos
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT client_id FROM contracts WHERE id = contract_id
      UNION
      SELECT provider_id FROM contracts WHERE id = contract_id
    )
  );

-- Both parties can insert their own evidence
CREATE POLICY "insert_own_evidence" ON contract_evidence_photos
  FOR INSERT
  WITH CHECK (
    (uploader_role = 'client' AND auth.uid() IN (SELECT client_id FROM contracts WHERE id = contract_id))
    OR
    (uploader_role = 'provider' AND auth.uid() IN (SELECT provider_id FROM contracts WHERE id = contract_id))
  );

-- Both parties can update their own evidence (only if not confirmed)
CREATE POLICY "update_own_evidence" ON contract_evidence_photos
  FOR UPDATE
  USING (
    status != 'confirmed' AND (
      (uploader_role = 'client' AND auth.uid() IN (SELECT client_id FROM contracts WHERE id = contract_id))
      OR
      (uploader_role = 'provider' AND auth.uid() IN (SELECT provider_id FROM contracts WHERE id = contract_id))
    )
  );

-- Add indexes for performance
CREATE INDEX idx_evidence_contract ON contract_evidence_photos(contract_id);
CREATE INDEX idx_evidence_status ON contract_evidence_photos(status);
CREATE INDEX idx_evidence_reminder ON contract_evidence_photos(reminder_sent_at) WHERE status != 'confirmed';

-- Add comment
COMMENT ON TABLE contract_evidence_photos IS 'Before and after photos uploaded by clients and providers for contract evidence';