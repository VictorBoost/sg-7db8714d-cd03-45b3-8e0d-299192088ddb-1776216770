-- Fix RLS policies for critical tables
-- Based on actual schema structure from database.types.ts

-- 1. admin_login_logs - public read for admin tracking
ALTER TABLE public.admin_login_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_admin_logs" ON public.admin_login_logs FOR SELECT USING (true);
CREATE POLICY "admin_insert_logs" ON public.admin_login_logs FOR INSERT WITH CHECK (true);

-- 2. categories - public read (needed for project posting)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_categories" ON public.categories FOR SELECT USING (true);

-- 3. contracts - users can see their own contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_contracts" ON public.contracts FOR SELECT USING (
  client_id = auth.uid() OR provider_id = auth.uid()
);
CREATE POLICY "users_update_own_contracts" ON public.contracts FOR UPDATE USING (
  client_id = auth.uid() OR provider_id = auth.uid()
);

-- 4. email_logs - public insert (system needs to log emails)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_insert_email_logs" ON public.email_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_email_logs" ON public.email_logs FOR SELECT USING (true);

-- 5. failed_login_lockouts - system needs to track failed logins
ALTER TABLE public.failed_login_lockouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_manage_lockouts" ON public.failed_login_lockouts FOR ALL USING (true);

-- 6. password_reset_tokens - users can access their own reset tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_reset_tokens" ON public.password_reset_tokens FOR SELECT USING (
  user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY "system_insert_reset_tokens" ON public.password_reset_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "system_update_reset_tokens" ON public.password_reset_tokens FOR UPDATE USING (true);

-- 7. routine_bookings - users can see their own bookings
ALTER TABLE public.routine_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_bookings" ON public.routine_bookings FOR SELECT USING (
  client_id = auth.uid() OR provider_id = auth.uid()
);
CREATE POLICY "users_update_own_bookings" ON public.routine_bookings FOR UPDATE USING (
  client_id = auth.uid() OR provider_id = auth.uid()
);