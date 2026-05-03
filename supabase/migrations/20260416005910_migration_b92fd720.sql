-- Create reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_project_id UUID NULL REFERENCES projects(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake', 'other')),
  note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE NULL,
  resolved_by UUID NULL REFERENCES profiles(id),
  CONSTRAINT reports_target_check CHECK (
    (reported_user_id IS NOT NULL AND reported_project_id IS NULL) OR
    (reported_user_id IS NULL AND reported_project_id IS NOT NULL)
  )
);

COMMENT ON TABLE reports IS 'User-submitted reports for spam, fake listings/profiles, and other violations';

-- Create indexes
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_reported_project ON reports(reported_project_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "users_create_reports" ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own submitted reports
CREATE POLICY "users_view_own_reports" ON reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admin and moderators can view all reports
CREATE POLICY "admin_view_all_reports" ON reports
  FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles 
    WHERE email LIKE '%@bluetika.co.nz'
  ));

-- Admin and moderators can update reports
CREATE POLICY "admin_update_reports" ON reports
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles 
    WHERE email LIKE '%@bluetika.co.nz'
  ));