-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public can view all projects
CREATE POLICY "public_read_projects" ON projects 
  FOR SELECT 
  USING (true);

-- Only verified clients can create projects
CREATE POLICY "clients_create_projects" ON projects 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE is_client = true
    )
  );

-- Clients can update their own projects
CREATE POLICY "clients_update_own_projects" ON projects 
  FOR UPDATE 
  USING (auth.uid() = client_id);

-- Clients can delete their own projects
CREATE POLICY "clients_delete_own_projects" ON projects 
  FOR DELETE 
  USING (auth.uid() = client_id);