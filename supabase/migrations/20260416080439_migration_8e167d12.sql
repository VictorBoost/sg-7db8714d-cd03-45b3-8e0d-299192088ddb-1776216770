-- Bot accounts tracking table
CREATE TABLE IF NOT EXISTS bot_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_type text NOT NULL CHECK (bot_type IN ('client', 'provider', 'mixed')),
  generation_batch integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_bot_accounts_profile ON bot_accounts(profile_id);
CREATE INDEX idx_bot_accounts_active ON bot_accounts(is_active);
CREATE INDEX idx_bot_accounts_batch ON bot_accounts(generation_batch);

-- Bot activity logs for tracking actions and errors
CREATE TABLE IF NOT EXISTS bot_activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id uuid NOT NULL REFERENCES bot_accounts(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_step text NOT NULL,
  success boolean NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_bot_logs_bot ON bot_activity_logs(bot_id);
CREATE INDEX idx_bot_logs_action ON bot_activity_logs(action_type);
CREATE INDEX idx_bot_logs_success ON bot_activity_logs(success);
CREATE INDEX idx_bot_logs_created ON bot_activity_logs(created_at DESC);

-- RLS policies for bot_accounts
ALTER TABLE bot_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_bot_accounts" ON bot_accounts
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE email LIKE '%@bluetika.co.nz'
    )
  );

-- RLS policies for bot_activity_logs
ALTER TABLE bot_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_bot_logs" ON bot_activity_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE email LIKE '%@bluetika.co.nz'
    )
  );

CREATE POLICY "system_create_bot_logs" ON bot_activity_logs
  FOR INSERT
  WITH CHECK (true);