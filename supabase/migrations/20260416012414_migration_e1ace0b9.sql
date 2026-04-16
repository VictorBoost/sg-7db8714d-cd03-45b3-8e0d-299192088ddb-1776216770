-- Add NZBN verification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN nzbn_number TEXT,
ADD COLUMN nzbn_verified BOOLEAN DEFAULT false,
ADD COLUMN nzbn_document_url TEXT;

COMMENT ON COLUMN profiles.nzbn_number IS 'New Zealand Business Number';
COMMENT ON COLUMN profiles.nzbn_verified IS 'Whether the NZBN has been verified by admin';
COMMENT ON COLUMN profiles.nzbn_document_url IS 'URL to NZBN verification document';