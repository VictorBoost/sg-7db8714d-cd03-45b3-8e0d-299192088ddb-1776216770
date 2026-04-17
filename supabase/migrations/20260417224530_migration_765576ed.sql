-- MonaLisa Settings Table
CREATE TABLE IF NOT EXISTS monalisa_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  is_active boolean NOT NULL DEFAULT false,
  last_check_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE monalisa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_monalisa_settings"
ON monalisa_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'bluetikanz@gmail.com'
  )
);

-- Insert default row
INSERT INTO monalisa_settings (id, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', false)
ON CONFLICT (id) DO NOTHING;

-- MonaLisa Logs Table
CREATE TABLE IF NOT EXISTS monalisa_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type text NOT NULL CHECK (action_type IN (
    'post_review',
    'contract_review', 
    'user_flag',
    'system_health',
    'suggestion'
  )),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  related_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  related_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  related_contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE monalisa_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_monalisa_logs"
ON monalisa_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'bluetikanz@gmail.com'
  )
);

CREATE POLICY "system_create_monalisa_logs"
ON monalisa_logs
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_monalisa_logs_created ON monalisa_logs(created_at DESC);
CREATE INDEX idx_monalisa_logs_action ON monalisa_logs(action_type);
CREATE INDEX idx_monalisa_logs_severity ON monalisa_logs(severity);
CREATE INDEX idx_monalisa_logs_user ON monalisa_logs(related_user_id);