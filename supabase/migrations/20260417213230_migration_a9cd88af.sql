-- Create staff table to track staff members
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('verifier', 'support', 'finance', 'moderator')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff audit logs table
CREATE TABLE IF NOT EXISTS staff_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff table (only admin can manage)
CREATE POLICY "admin_manage_staff" ON staff FOR ALL USING (
  auth.email() = 'bluetikanz@gmail.com' OR auth.email() LIKE '%@bluetika.co.nz'
);

-- RLS policies for staff_audit_logs (only admin can view)
CREATE POLICY "admin_view_audit_logs" ON staff_audit_logs FOR SELECT USING (
  auth.email() = 'bluetikanz@gmail.com' OR auth.email() LIKE '%@bluetika.co.nz'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_staff_id ON staff_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_timestamp ON staff_audit_logs(timestamp DESC);