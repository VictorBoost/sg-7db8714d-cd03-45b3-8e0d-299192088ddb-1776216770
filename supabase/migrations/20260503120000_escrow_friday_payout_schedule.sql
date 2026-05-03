-- Escrow: Friday batch payouts + auto-release windows (Pacific/Auckland rules enforced in app)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_work_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_payout_scheduled_for DATE,
  ADD COLUMN IF NOT EXISTS escrow_auto_notice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_auto_reject_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escrow_admin_hold BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.contracts.client_work_accepted_at IS 'Client explicitly accepted completed work; Stripe payout follows stripe_payout_scheduled_for.';
COMMENT ON COLUMN public.contracts.stripe_payout_scheduled_for IS 'NZ calendar date (Friday) when Stripe transfer should run.';
COMMENT ON COLUMN public.contracts.escrow_auto_notice_sent_at IS 'Auto-release path: notice sent to client after gate + 48h.';
COMMENT ON COLUMN public.contracts.escrow_auto_reject_deadline IS 'Auto-release path: client may reject until this time; then payout date is scheduled.';
COMMENT ON COLUMN public.contracts.escrow_admin_hold IS 'Admin blocks Stripe payout until cleared.';
