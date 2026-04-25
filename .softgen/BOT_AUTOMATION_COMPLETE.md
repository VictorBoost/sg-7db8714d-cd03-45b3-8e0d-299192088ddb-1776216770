# 🤖 Bot Automation System - COMPLETE & OPERATIONAL

## ✅ System Status: FULLY AUTOMATED

The bot automation system is now running 24/7 with automatic Stripe payments.

## 🔄 Automation Schedule

**Cron Job:** Every 5 minutes (`*/5 * * * *`)
- **Edge Function:** `hourly-bot-cycle`
- **Automatic:** YES - runs without manual intervention
- **Database:** PostgreSQL cron job (pg_cron extension)

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
1. Create Payment Intent (automatic capture)
2. Create Payment Method (test card)
3. Confirm Payment Intent
4. Update Contract:
   - payment_status: "held"
   - stripe_payment_intent_id: pi_xxx
   - platform_fee: $16.00 (8%)
   - payment_processing_fee: $6.10 (2.9% + $0.30)
   - total_amount: $206.10
   - auto_release_eligible_at: +48 hours
```

### 5. Complete Work & Release Funds
- **Evidence Photos:** 2 photos uploaded from Unsplash
- **Work Status:** Marked as "done"
- **Fund Release:** Auto-release after 48 hours
- **Final Status:** "completed"

## 🎯 Bot Payment Integration

### API Endpoint: `/api/bot-payment`
Handles automated Stripe payments for bot contracts.

**Features:**
- ✅ Verifies bot contract ownership
- ✅ Uses Stripe test card (no real money)
- ✅ Calculates platform + processing fees
- ✅ Creates Payment Intent with automatic capture
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
https://{project-ref}.supabase.co/functions/v1/bot-make-payment
```

**Usage:**
```bash
curl -X POST {function-url} \
  -H "Authorization: Bearer {anon-key}" \
  -H "Content-Type: application/json" \
  -d '{"contractId": "contract-id-here"}'
```

## 📊 Monitoring Dashboard

Access: `/muna/bot-lab`

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

## 📈 Expected Activity (Per 5-Minute Cycle)

Assuming 50 bots (25 clients, 25 providers):

**Projects:** 25-125 new projects
**Bids:** 25-75 new bids
**Contracts:** 1-10 new contracts
**Payments:** 1-5 completed payments
**Work Completion:** 1-3 contracts marked done

## 🚨 Troubleshooting

### Bot Payments Not Working
1. Check Stripe API keys in `.env.local`
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

-- Manually trigger
SELECT cron.schedule('bot-automation-cycle', '*/5 * * * *', 
  $$SELECT net.http_post(...) AS request_id$$);
```

### Payment Errors
Common issues:
- Invalid Stripe keys
- Test card declined (use 4242 4242 4242 4242)
- Webhook secret mismatch
- Contract already paid

## 🔐 Security Notes

- **Test Mode Only:** All payments use Stripe test mode
- **Bot Verification:** Only contracts owned by bot_accounts can use automated payment
- **No Real Money:** Test card 4242 4242 4242 4242 never charges real funds
- **Webhook Validation:** Stripe signatures verified on webhook endpoint

## 📝 Database Schema

### Key Tables
- `bot_accounts` - Bot profile tracking
- `contracts` - Contract with payment_status field
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
- [x] Bot-lab dashboard accessible
- [x] Error logging and monitoring active
- [x] Auto-release scheduler configured

## 🎉 Success Criteria

The system is working correctly when:
1. ✅ New projects appear every 5 minutes
2. ✅ Bids are submitted automatically
3. ✅ Contracts created with "active" status
4. ✅ Payments processed (status changes to "held")
5. ✅ Work marked complete with photos
6. ✅ Funds auto-released after 48 hours
7. ✅ No errors in bot-lab dashboard

---

**Last Updated:** 2026-04-25  
**Status:** ✅ OPERATIONAL  
**Next Review:** Check dashboard daily for anomalies