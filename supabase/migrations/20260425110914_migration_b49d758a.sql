-- Enable pg_net extension for HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop and recreate the cron job with correct interval (5-8 minutes randomly)
SELECT cron.unschedule('bot-automation-cycle');

-- Create cron job that runs every 5 minutes (will be the base interval)
SELECT cron.schedule(
  'bot-automation-cycle',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ctvfgcjrwqsqxotahlbx.supabase.co/functions/v1/hourly-bot-cycle',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dmZnY2pyd3FzcXhvdGFobGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjkyNjAsImV4cCI6MjA2MDMwNTI2MH0.hW6XMzwfAEcEk9JsD1K5CpZQ_0d3l7FkQXRTOFaL5Bw"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify cron job was created
SELECT jobid, schedule, command FROM cron.job WHERE jobname = 'bot-automation-cycle';