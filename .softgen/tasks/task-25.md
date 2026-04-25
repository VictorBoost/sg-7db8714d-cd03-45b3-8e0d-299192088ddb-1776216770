---
title: Build bot activity dashboard in Muna
status: done
priority: high
type: feature
tags: [muna, bots, dashboard, monitoring]
created_by: agent
created_at: 2026-04-25T20:17:33Z
position: 25
---

## Notes
Create a real-time dashboard in /muna showing all bot activities:
- Bids placed by bots
- Contracts created
- Payments made
- Work completed
- Reviews submitted
- Filter by action type
- Auto-refresh capability
- Show timestamp, bot info, action details

## Checklist
- [x] Create /muna/bot-activity.tsx page
- [x] Query bot_activity_logs table
- [x] Display activities in chronological order
- [x] Add filter by action type
- [x] Show bot profile info (name, email)
- [x] Display action details (project, bid, contract IDs)
- [x] Add auto-refresh toggle (30 seconds)
- [x] Style with consistent Muna dashboard theme
- [x] Add stats cards (total activities, by type)

## Acceptance
- Dashboard shows real-time bot activities
- Filtering works correctly
- Auto-refresh updates every 30 seconds
- Clear presentation of all bot actions