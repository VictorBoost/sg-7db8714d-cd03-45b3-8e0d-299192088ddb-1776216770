-- Create test table
CREATE TABLE IF NOT EXISTS connection_test (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE connection_test ENABLE ROW LEVEL SECURITY;

-- Allow public read access for testing
CREATE POLICY "public_read_test" ON connection_test FOR SELECT USING (true);

-- Insert test data
INSERT INTO connection_test (message) VALUES 
  ('🎉 Supabase connection successful!'),
  ('✅ New Vercel account is connected'),
  ('🚀 BlueTika is ready to go!');