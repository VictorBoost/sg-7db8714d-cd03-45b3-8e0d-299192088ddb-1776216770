-- Add verification fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS driver_licence_number TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS driver_licence_url TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

-- Create trade certificates table
CREATE TABLE IF NOT EXISTS trade_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certificate_type TEXT NOT NULL,
  certificate_number TEXT NOT NULL,
  document_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create provider categories junction table
CREATE TABLE IF NOT EXISTS provider_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, category_id)
);

-- RLS Policies for trade_certificates
ALTER TABLE trade_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers_view_own_certificates" ON trade_certificates
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "providers_insert_own_certificates" ON trade_certificates
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "providers_delete_own_certificates" ON trade_certificates
  FOR DELETE USING (auth.uid() = provider_id);

-- RLS Policies for provider_categories
ALTER TABLE provider_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_view_provider_categories" ON provider_categories
  FOR SELECT USING (true);

CREATE POLICY "providers_manage_own_categories" ON provider_categories
  FOR ALL USING (auth.uid() = provider_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trade_certificates_provider ON trade_certificates(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_categories_provider ON provider_categories(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_categories_category ON provider_categories(category_id);