-- Add outcome field to reports table to track action taken
ALTER TABLE reports ADD COLUMN outcome text CHECK (outcome IN ('pending', 'actioned', 'dismissed')) DEFAULT 'pending';

-- Add index for efficient outcome queries
CREATE INDEX idx_reports_outcome ON reports(outcome);
CREATE INDEX idx_reports_reporter_outcome ON reports(reporter_id, outcome);

-- Create view for reporter analytics
CREATE OR REPLACE VIEW reporter_analytics AS
SELECT 
  reporter_id,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE outcome = 'actioned') as actioned_reports,
  COUNT(*) FILTER (WHERE outcome = 'dismissed') as dismissed_reports,
  COUNT(*) FILTER (WHERE outcome = 'pending') as pending_reports,
  ROUND(
    CASE 
      WHEN COUNT(*) FILTER (WHERE outcome != 'pending') = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE outcome = 'actioned')::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE outcome != 'pending'), 0) * 100)
    END, 
    1
  ) as accuracy_rate
FROM reports
GROUP BY reporter_id;

-- Grant select access to authenticated users for the view
GRANT SELECT ON reporter_analytics TO authenticated;