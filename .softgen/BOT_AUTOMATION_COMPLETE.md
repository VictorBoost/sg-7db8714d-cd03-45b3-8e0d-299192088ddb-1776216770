# 🤖 Bot Automation System - COMPLETE & OPERATIONAL

## ✅ System Status: FULLY AUTOMATED

The bot automation system is now running 24/7 with automatic Stripe payments.

## 🔄 Automation Schedule

**Cron Job:** Every 5 minutes (`*/5 * * * *`)
- **Edge Function:** `hourly-bot-cycle`
- **Automatic:** YES - runs without manual intervention
- **Database:** PostgreSQL cron job (pg_cron + pg_net extensions enabled)

## 📋 Complete Bot Lifecycle

Each bot completes the following cycle every 5 minutes:

### 1. Post Projects (Client Bots)
- **Volume:** 1-5 projects per client bot
- **Categories:** Random from active categories
- **Budget:** $80-$400 NZD
- **Locations:** Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin

### 2. Submit Bids (Provider Bots)
- **Volume:** 1-3 bids per provider bot
- **Amount:** 85-95% of project budget
- **Message:** "Hi! I can help with this. Available to start soon."

### 3. Accept Bids & Create Contracts (Client Bots)
- **Selection:** Random bid from pending bids
- **Contract:** Created with status "active"
- **Other Bids:** Automatically declined

### 4. Process Stripe Payments (AUTOMATIC)
- **Payment Method:** Stripe test card (4242 4242 4242 4242)
- **Amount:** Base amount + 2.9% + $0.30 processing fee
- **Platform Fee:** 8% commission (held in escrow)
- **Status:** Payment held in escrow until work completion
- **Metadata:** Contract ID, platform fee, processing fee, isBot=true

**Payment Flow:**
```
1. Create Payment Intent (manual capture for escrow)
2. Create Payment Method (test card)
3. Confirm Payment Intent
4. Update Contract:
   - payment_status: "held"
   - stripe_payment_intent_id: pi_xxx
   - platform_fee: 8% of base amount
   - payment_processing_fee: 2.9% + $0.30
   - total_amount: base + processing fee
   - auto_release_eligible_at: +48 hours
```

### 5. Complete Work & Upload Photos (Provider Bots)
- **Evidence Photos:** 2 photos uploaded from Unsplash
- **Work Status:** Marked as "awaiting_fund_release"
- **Provider Behavior:** Upload photos and request payment

### 6. Fund Release (Client Bots - REALISTIC BEHAVIOR)
- **30% chance:** Client releases funds immediately
- **70% chance:** Client ghosts (tests auto-release after 48 hours)
- **Auto-Release:** Funds automatically released after 48 hours if client doesn't respond

## 🎯 Bot Payment Integration

### API Endpoint: `/api/bot-payment`
Handles automated Stripe payments for bot contracts.

**Features:**
- ✅ Verifies bot contract ownership
- ✅ Uses Stripe test card (no real money)
- ✅ Calculates platform + processing fees
- ✅ Creates Payment Intent with manual capture (for escrow)
- ✅ Updates contract with payment details
- ✅ Sets 48-hour auto-release timer

**Test Card Details:**
```
Card Number: 4242 4242 4242 4242
Expiry: 12/2030
CVC: 123
```

### Edge Function: `bot-make-payment`
Deployed Edge Function for cron job integration.

**Endpoint:** 
```
https://tjgxkzhrkajebpnvhekw.supabase.co/functions/v1/bot-make-payment
```

**Usage:**
```bash
curl -X POST {function-url} \
  -H "Authorization: Bearer {anon-key}" \
  -H "Content-Type: application/json" \
  -d '{"contractId": "contract-id-here"}'
```

## 📊 Monitoring Dashboards

### 1. Bot Lab Dashboard
**Access:** `/muna/bot-lab`

**Features:**
- ✅ Real-time automation status (Active/Inactive)
- ✅ Bot statistics (Total, Clients, Providers)
- ✅ Payment tracking (Paid contracts count)
- ✅ Error summary and logs
- ✅ Manual controls:
  - Start/Stop automation
  - Run manual cycle
  - Test payment system
  - Kill switch (delete all bots)

### 2. Contract Monitoring Dashboard (NEW!)
**Access:** `/muna/contracts-monitor`

**Features:**
- ✅ View ALL contracts with status and payment details
- ✅ See client-provider chat messages for each contract
- ✅ Monitor for bypass attempts (off-platform payment arrangements)
- ✅ Filter by status: Active, Awaiting Release, Completed, Disputed
- ✅ Payment breakdown: Base amount, platform fee, processing fee, total
- ✅ Timeline: Contract created → Work done → Funds released
- ✅ Click any contract to see full details including all chat messages

**Anti-Bypass Protection:**
- All messages between clients and providers are logged
- Dashboard shows warning if messages exist (potential bypass attempt)
- Platform owner can review all communications
- Any arrangements to pay outside the platform are flagged

## 🔧 Manual Testing

### Test Payment System
1. Navigate to `/muna/bot-lab`
2. Click "Test Payment" button
3. System will:
   - Find a pending contract
   - Process Stripe test payment
   - Display payment result

### Run Manual Cycle
1. Click "Run Manual Cycle" button
2. View results:
   - Projects posted
   - Bids submitted
   - Contracts created
   - Payments processed

### Monitor Contracts
1. Navigate to `/muna/contracts-monitor`
2. View all contracts with:
   - Status and payment information
   - Client and provider details
   - Chat messages (detect bypass attempts)
   - Payment breakdown
3. Click any contract card to see full details

## 📈 Expected Activity (Per 5-Minute Cycle)

Assuming 50 bots (25 clients, 25 providers):

**Projects:** 25-125 new projects
**Bids:** 25-75 new bids
**Contracts:** 1-10 new contracts
**Payments:** 1-5 completed payments
**Work Completion:** 1-3 contracts marked done
**Fund Releases:** 30% immediate, 70% after 48h auto-release

## 🚨 Troubleshooting

### Bot Payments Not Working
1. Check Stripe API keys in Edge Function secrets
2. Verify webhook endpoint is configured
3. Check Edge Function logs for errors
4. Ensure `bot_payments_enabled` setting is `true`

### Cron Job Not Running
```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'bot-automation-cycle';

-- Check recent runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'bot-automation-cycle')
ORDER BY start_time DESC 
LIMIT 10;

-- Manually trigger (if needed)
SELECT net.http_post(
  url:='https://tjgxkzhrkajebpnvhekw.supabase.co/functions/v1/hourly-bot-cycle',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer {anon-key}"}'::jsonb
) AS request_id;
```

### Payment Errors
Common issues:
- Invalid Stripe keys in Edge Function secrets
- Test card declined (use 4242 4242 4242 4242)
- Webhook secret mismatch
- Contract already paid

## 🔐 Security Notes

- **Test Mode Only:** All payments use Stripe test mode
- **Bot Verification:** Only contracts owned by bot_accounts can use automated payment
- **No Real Money:** Test card 4242 4242 4242 4242 never charges real funds
- **Webhook Validation:** Stripe signatures verified on webhook endpoint
- **Anti-Bypass Monitoring:** All chat messages logged and reviewable by platform owner

## 📝 Database Schema

### Key Tables
- `bot_accounts` - Bot profile tracking
- `contracts` - Contract with payment_status field
- `contract_messages` - Chat messages between clients and providers
- `evidence_photos` - Work completion photos
- `platform_settings` - Automation toggles

### Platform Settings
```sql
-- Enable/disable automation
UPDATE platform_settings 
SET setting_value = 'true' 
WHERE setting_key = 'bot_automation_enabled';

-- Enable/disable payments
UPDATE platform_settings 
SET setting_value = 'true' 
WHERE setting_key = 'bot_payments_enabled';
```

## ✅ System Health Checklist

- [x] Cron job scheduled and running every 5 minutes
- [x] Edge Functions deployed (hourly-bot-cycle, bot-make-payment)
- [x] Stripe integration configured with test keys
- [x] Webhook endpoint receiving events
- [x] Payment flow tested and working
- [x] Bot-lab dashboard accessible at `/muna/bot-lab`
- [x] Contract monitoring dashboard accessible at `/muna/contracts-monitor`
- [x] Error logging and monitoring active
- [x] Auto-release scheduler configured (48 hours)
- [x] Anti-bypass monitoring enabled (all messages logged)

## 🎉 Success Criteria

The system is working correctly when:
1. ✅ New projects appear every 5 minutes
2. ✅ Bids are submitted automatically
3. ✅ Contracts created with "active" status
4. ✅ Payments processed (status changes to "held")
5. ✅ Work marked complete with photos
6. ✅ 30% of funds released immediately, 70% after 48h auto-release
7. ✅ No errors in bot-lab dashboard
8. ✅ All chat messages visible in contracts-monitor dashboard

## 🛡️ Anti-Bypass Protection

**How to Monitor:**
1. Go to `/muna/contracts-monitor`
2. Click any contract with chat messages
3. Review all messages between client and provider
4. Look for keywords indicating off-platform payment:
   - "cash", "direct payment", "pay outside", "bypass", "directly"
   - Phone numbers, email addresses, external payment links
   - Any mention of avoiding platform fees

**If Bypass Detected:**
- Flag the contract in the dashboard
- Contact both parties
- Apply platform penalties as per Terms of Service
- All messages are timestamped and attributed to specific users

---

**Last Updated:** 2026-04-25  
**Status:** ✅ OPERATIONAL  
**Next Review:** Check both dashboards daily for anomalies and bypass attempts