# Bot Automation System - Complete Guide

## 🚀 System Overview

The bot automation system runs **automatically every 5 minutes** and completes the full project lifecycle:

1. **Post Projects** (1-5 per client bot)
2. **Submit Bids** (1-3 per provider bot)
3. **Accept Bids** (1-2 contracts created)
4. **Process Stripe Payments** (TEST MODE - automatic)
5. **Complete Work** (upload photos, submit for approval)
6. **Auto-Release Funds** (after 48 hours)

## 📊 Current Status

**Automation:** ✅ ACTIVE (runs every 5 minutes)  
**Payments:** ✅ ENABLED (Stripe Test Mode)  
**Scheduler:** ✅ pg_cron (PostgreSQL cron)  
**Edge Functions:** ✅ Deployed

## 🔧 How It Works

### Automatic Scheduler (pg_cron)
```sql
-- Runs every 5 minutes automatically
'*/5 * * * *' → hourly-bot-cycle Edge Function
```

### Payment Flow
1. Bot creates contract (payment_status: "pending")
2. `hourly-bot-cycle` calls `bot-make-payment`
3. `bot-make-payment` creates Stripe test payment
4. Stripe webhook confirms payment
5. Contract updated (payment_status: "held")
6. Provider uploads photos
7. Client approves (or auto-release after 48h)
8. Funds released to provider

### Stripe Test Cards (Automatic)
- **Card:** 4242 4242 4242 4242
- **Exp:** 12/2030
- **CVC:** 123
- **Result:** Always succeeds

## 🎯 Per-Bot Activity (Every 5 Minutes)

### Client Bots
- Create 1-5 random projects
- Accept 1-2 winning bids
- Pay via Stripe (automatic)
- Approve completed work

### Provider Bots
- Submit 1-3 bids on open projects
- Upload before/after photos
- Complete work
- Receive payments

## 📈 Monitoring

### Bot Lab Dashboard
Go to: `/muna/bot-lab`

**Stats Tracked:**
- Total bots (client/provider split)
- Paid contracts (payment_status: held/released)
- Completed contracts
- Error logs

### Database Queries

```sql
-- Check automation status
SELECT setting_key, setting_value 
FROM platform_settings 
WHERE setting_key IN ('bot_automation_enabled', 'bot_payments_enabled');

-- View recent bot activity
SELECT * FROM bot_activity_logs 
ORDER BY created_at DESC 
LIMIT 50;

-- Check payment status
SELECT 
  c.id,
  c.payment_status,
  c.status,
  c.final_amount,
  c.platform_fee,
  p.title as project
FROM contracts c
JOIN projects p ON p.id = c.project_id
WHERE c.client_id IN (SELECT profile_id FROM bot_accounts)
ORDER BY c.created_at DESC
LIMIT 20;

-- Monitor Stripe payments
SELECT 
  id,
  final_amount,
  payment_status,
  stripe_payment_intent_id,
  created_at
FROM contracts
WHERE stripe_payment_intent_id IS NOT NULL
ORDER BY created_at DESC;
```

## 🛠️ Manual Controls

### Start Automation
```typescript
await botLabService.toggleAutomation(true);
await botLabService.toggleBotPayments(true);
```

### Stop Automation
```typescript
await botLabService.toggleAutomation(false);
await botLabService.toggleBotPayments(false);
```

### Run Manual Cycle (Testing)
```typescript
const result = await botLabService.runManualCycle();
console.log(result);
```

### Test Single Payment
```typescript
const result = await botLabService.testBotPayment(contractId);
console.log(result);
```

### Emergency Kill Switch
```typescript
// Stops automation + deletes ALL bot data
const result = await botLabService.killSwitch();
console.log(`Deleted ${result.deleted} bots`);
```

## 🔍 Troubleshooting

### Payments Not Processing

1. **Check Stripe Keys**
```bash
# Verify in .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET_MARKETPLACE=whsec_...
```

2. **Check Webhook**
```bash
# Stripe webhook must point to:
https://your-domain.com/api/webhooks/stripe

# Test events:
payment_intent.succeeded
```

3. **Check Database**
```sql
-- Contracts stuck in 'pending'?
SELECT COUNT(*) FROM contracts WHERE payment_status = 'pending';

-- Check for errors
SELECT * FROM bot_activity_logs WHERE error_message IS NOT NULL;
```

### Automation Not Running

1. **Check pg_cron**
```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- Check last run
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

2. **Check Platform Settings**
```sql
SELECT * FROM platform_settings 
WHERE setting_key LIKE 'bot%';
```

3. **Manual Test**
```bash
# Call Edge Function directly
curl -X POST https://ctvfgcjrwqsqxotahlbx.supabase.co/functions/v1/hourly-bot-cycle \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Edge Function Errors

**View Logs:**
```bash
# In Supabase Dashboard:
Functions → hourly-bot-cycle → Logs

# Or via CLI:
supabase functions logs hourly-bot-cycle
```

**Common Issues:**
- Stripe key not set → Check Edge Function secrets
- Contract not found → Ensure bots exist
- Payment fails → Check Stripe test mode

## 📋 API Endpoints

### Bot Payment (Manual Trigger)
```bash
POST /api/bot-payment
{
  "contractId": "uuid"
}
```

### Generate Bots
```bash
POST /api/generate-bots
{
  "count": 50
}
```

## 🎨 Edge Functions

### bot-make-payment
**Path:** `supabase/functions/bot-make-payment/index.ts`  
**Purpose:** Create Stripe test payments for bot contracts  
**Trigger:** Called by hourly-bot-cycle  
**Method:** Uses Stripe test card 4242...

### hourly-bot-cycle
**Path:** `supabase/functions/hourly-bot-cycle/index.ts`  
**Purpose:** Complete bot lifecycle every 5 minutes  
**Trigger:** pg_cron scheduler  
**Steps:** Projects → Bids → Contracts → Payments → Completion

## 🔐 Security Notes

- All payments use **Stripe Test Mode**
- Bot accounts flagged in `bot_accounts` table
- Webhooks verify `isBot` metadata
- No emails sent for bot activity
- Isolated from real user data

## 📊 Expected Activity Levels

**Per 5-Minute Cycle:**
- 10-50 new projects
- 20-60 new bids
- 5-20 new contracts
- 5-10 payments processed
- 1-3 contracts completed

**Daily:**
- ~500 projects
- ~800 bids
- ~200 contracts
- ~150 payments
- ~50 completions

## ✅ Success Indicators

1. **Database Growth**
   - Projects table increases
   - Contracts have payment_status: "held"
   - Reviews appear after completion

2. **Stripe Dashboard**
   - Test payments appearing
   - Payment intents with "BlueTika Bot Contract" description
   - metadata.isBot = "true"

3. **Bot Lab Stats**
   - Paid contracts > 0
   - Completed contracts > 0
   - Error count minimal

## 🚨 Alerts

System monitors:
- Payment failures
- Edge Function errors
- Bot activity anomalies
- Stripe webhook failures

Check `/muna/bot-lab` for real-time status and error logs.