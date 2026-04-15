---
title: Implement Ratings and Reviews System
status: done
priority: high
type: feature
tags: [reviews, ratings, notifications, payments]
created_by: agent
created_at: 2026-04-15T22:31:30Z
position: 6
---

## Notes
After evidence photos are confirmed by both parties, implement mandatory ratings and reviews before fund release. Reviews must be publicly visible on user profiles, with reminder system for late submissions and admin notification for fund release approval.

## Checklist
- [x] Create reviews table with star rating (1-5) and written review fields
- [x] Add RLS policies for review creation and public viewing
- [x] Create review submission forms (one for client, one for provider)
- [x] Display reviews on user profiles publicly
- [x] Implement 48-hour reminder system for pending reviews (email + notification)
- [x] Send admin notification when both reviews are submitted
- [x] Update contract status to "Awaiting Fund Release" after both reviews submitted
- [x] Add review status tracking to contract detail page