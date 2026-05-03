-- Update routine_bookings to link to routine_contracts
ALTER TABLE routine_bookings
ADD COLUMN routine_contract_id UUID NULL REFERENCES routine_contracts(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_routine_bookings_routine_contract ON routine_bookings(routine_contract_id);

-- Add columns for reminder tracking
ALTER TABLE routine_bookings
ADD COLUMN reminder_sent BOOLEAN DEFAULT false,
ADD COLUMN reminder_sent_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN routine_bookings.routine_contract_id IS 'Links booking to parent routine contract';
COMMENT ON COLUMN routine_bookings.reminder_sent IS 'Whether 48-hour reminder has been sent';