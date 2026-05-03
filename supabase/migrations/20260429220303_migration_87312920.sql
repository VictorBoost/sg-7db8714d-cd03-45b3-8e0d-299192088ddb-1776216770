-- Fix RLS on verification_documents - allow owner to see ALL verifications
DROP POLICY IF EXISTS "Owner can view all verification documents" ON verification_documents;

CREATE POLICY "Owner can view all verification documents"
ON verification_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'bluetikanz@gmail.com'
  )
);