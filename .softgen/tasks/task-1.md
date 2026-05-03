---
title: Design System & Database Foundation
status: done
priority: urgent
type: feature
tags: [design, database, auth]
created_by: agent
created_at: 2026-04-15T00:44:18Z
position: 1
---

## Notes
Set up BlueTika's design system (NZ blue/teal palette, Outfit + Work Sans fonts) and database schema for users, projects, bids, and contracts. Enable auth with dual user types (Client + Service Provider).

## Checklist
- [x] Convert brand hex colors to HSL via terminal
- [x] Update globals.css with BlueTika color tokens
- [x] Configure Outfit + Work Sans in tailwind.config.ts
- [x] Create database tables: profiles (user_type, is_client, is_provider), projects (title, description, budget, location, status), bids (amount, message, status), contracts (project_id, provider_id, final_amount, status)
- [x] Apply RLS policies (T1 for profiles, T2 for projects/bids/contracts)
- [x] Set up auth trigger for automatic profile creation
- [x] Create authService integration