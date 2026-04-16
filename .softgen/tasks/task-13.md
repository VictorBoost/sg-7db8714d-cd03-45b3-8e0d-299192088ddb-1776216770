---
title: Subscriptions System
status: todo
priority: high
type: feature
tags: [service-provider, subscriptions, stripe, billing]
created_by: agent
created_at: 2026-04-16T09:03:57Z
position: 13
---

## Notes
Service providers can subscribe to additional features with monthly billing via Stripe. All subscriptions share one billing date with prorated first payment. Features:
- Remove BlueTika logo and use own email: $5/month
- Email hosting (name@company.co.nz): $5/month
- Custom profile URL at bluetika.co.nz/name: $5/month
- Additional staff members: $2/month per person
- Prorated billing: remaining days in current period + next 30 days
- Failed payment: 3-day grace period, then suspend feature, send SES reminder

Admin can edit subscription prices in control panel.

## Checklist
- [ ] Create subscription_plans table: name, description, monthly_price, is_active, feature_key (unique)
- [ ] Create provider_subscriptions table: provider_id FK, plan_id FK, stripe_subscription_id, status, billing_date, created_at
- [ ] Create subscription_prices table for admin-editable pricing
- [ ] Add RLS policies for subscriptions (T1: provider views their own, admin manages plans)
- [ ] Create subscriptionService.ts with Stripe integration, prorated billing calculation
- [ ] Create subscriptions UI: available plans, active subscriptions, billing date
- [ ] Create Stripe checkout flow for subscription purchases
- [ ] Add subscription status checks throughout app (logo removal, custom URL, etc.)
- [ ] Create subscription management API routes for Stripe webhooks
- [ ] Add failed payment handling: 3-day grace period, SES notifications, feature suspension
- [ ] Add subscription pricing management UI to control panel (owner only)
- [ ] Seed default subscription plans with current prices