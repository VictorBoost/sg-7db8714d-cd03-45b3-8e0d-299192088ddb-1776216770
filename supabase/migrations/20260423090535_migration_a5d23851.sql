-- Fix RLS for platform_settings to allow admin toggles to save
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Admin Update platform_settings" ON platform_settings;
CREATE POLICY "Public Read platform_settings" ON platform_settings FOR SELECT USING (true);
CREATE POLICY "Admin Update platform_settings" ON platform_settings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Fix RLS for monalisa_settings to allow activation
ALTER TABLE monalisa_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read monalisa_settings" ON monalisa_settings;
DROP POLICY IF EXISTS "Admin Update monalisa_settings" ON monalisa_settings;
CREATE POLICY "Public Read monalisa_settings" ON monalisa_settings FOR SELECT USING (true);
CREATE POLICY "Admin Update monalisa_settings" ON monalisa_settings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Seed monalisa_settings if empty so upsert works flawlessly
INSERT INTO monalisa_settings (id, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', false) 
ON CONFLICT (id) DO NOTHING;