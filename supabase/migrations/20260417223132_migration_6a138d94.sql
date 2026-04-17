-- Create bypass attempt logs table
CREATE TABLE IF NOT EXISTS bot_bypass_attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_type text NOT NULL, -- 'phone', 'email', 'whatsapp', 'url', etc.
  content_snippet text NOT NULL,
  detection_status text NOT NULL, -- 'flagged', 'passed', 'warned', 'blocked'
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  bid_id uuid REFERENCES bids(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bot_bypass_attempts_bot ON bot_bypass_attempts(bot_profile_id);
CREATE INDEX idx_bot_bypass_attempts_status ON bot_bypass_attempts(detection_status);
CREATE INDEX idx_bot_bypass_attempts_type ON bot_bypass_attempts(attempt_type);

-- Enable RLS
ALTER TABLE bot_bypass_attempts ENABLE ROW LEVEL SECURITY;

-- Owner can view all bypass attempts
CREATE POLICY "owner_view_bypass_attempts" ON bot_bypass_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'bluetikanz@gmail.com'
    )
  );

-- System can create bypass logs
CREATE POLICY "system_create_bypass_logs" ON bot_bypass_attempts
  FOR INSERT
  WITH CHECK (true);