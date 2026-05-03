---
title: Enable Project Listings for Verified Clients
status: done
priority: high
type: feature
tags: ["projects", "listings", "media-uploads"]
created_by: agent
created_at: 2026-04-15
position: 2
---

## Notes
Implement a complete project listing system where verified clients can post projects with rich media (photos + video). Projects expire after 30 days with countdown and one-click reopen. Service providers can browse all listings.

## Checklist
- [x] Create post-project.tsx form with all required fields
- [x] Add photo upload system (up to 5, JPG/PNG, 10MB max) with preview
- [x] Add video upload (optional, MP4, 30s max, 50MB max) with validation
- [x] Store media in Supabase Storage project-media bucket
- [x] Set 30-day auto-expiry on new projects (expires_at, is_expired fields)
- [x] Add real-time countdown timer on project detail page
- [x] Implement one-click reopen for expired listings
- [x] Add RLS policies (public read, authenticated client write)
- [x] Show 2% platform fee notice on form
- [x] Restrict listing creation to verified clients only