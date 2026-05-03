---
title: Service Provider Bidding System
status: done
priority: high
type: feature
tags: [bidding, providers, verification]
created_by: agent
created_at: 2026-04-15T20:44:18Z
position: 3
---

## Notes
Complete bidding system for verified service providers. Browse open listings with comprehensive filters, submit bids with timeline and terms, upload trade certificates, view bid status in dashboard. Domestic Helper listings require DH verification (police check + first aid).

## Checklist
- [x] Add bid fields to database (estimated_timeline, trade_certificate_url)
- [x] Create RLS policies for bids (providers can create/read own, clients can read project bids)
- [x] Build My Bids dashboard with status grouping (Pending, Accepted, Declined)
- [x] Add comprehensive filters to browse page (category, subcategory for DH, location, budget, date)
- [x] Update ProjectCard to show all required info (title, category, subcategory, budget, location, date, bid count, time posted)
- [x] Implement full bid submission form (price, timeline, terms, trade cert upload)
- [x] Show commission tier badge and 8% promotional rate notice
- [x] Implement Domestic Helper verification check (hide DH bids from clients if provider not DH-verified)
- [x] Add navigation link to My Bids for providers
- [x] Test complete bidding flow end-to-end