-- Also ensure disputes, contracts, and fund releases are accessible to owner
DROP POLICY IF EXISTS "Owner can view all disputes" ON disputes;
DROP POLICY IF EXISTS "Owner can view all contracts" ON contracts;

CREATE POLICY "Owner can view all disputes"
ON disputes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'bluetikanz@gmail.com'
  )
);

CREATE POLICY "Owner can view all contracts"
ON contracts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email = 'bluetikanz@gmail.com'
  )
);