-- Check if RLS is enabled on subcategories table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'subcategories';

-- Add public read policy for subcategories
CREATE POLICY "public_read_subcategories" 
ON subcategories 
FOR SELECT 
USING (true);

-- Verify the policy was created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'subcategories';